package com.financeiro.service;

import com.financeiro.domain.*;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.*;
import com.financeiro.web.dto.BillRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BillService {

    private static final BigDecimal ZERO = BigDecimal.ZERO;

    private final BillRepository billRepository;
    private final BillInstallmentRepository installmentRepository;
    private final TransactionRepository transactionRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    public List<BillRequest.Response> list(Long householdId) {
        return billRepository.findAllScoped(householdId).stream()
                .map(bill -> BillRequest.Response.from(bill, installmentRepository.findByBillIdOrderByNumberAsc(bill.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public BillRequest.Response get(Long householdId, Long billId) {
        Bill bill = requireScoped(householdId, billId);
        return BillRequest.Response.from(bill, installmentRepository.findByBillIdOrderByNumberAsc(billId));
    }

    @Transactional
    public BillRequest.Response create(Long householdId, Long userId, BillRequest request) {
        Account account = accountService.requireScoped(householdId, request.accountId());
        if (!account.isActive()) {
            throw new BusinessRuleException("A conta '" + account.getName() + "' esta inativa");
        }

        Category category = null;
        if (request.categoryId() != null) {
            category = categoryService.requireScoped(householdId, request.categoryId(),
                    request.type() == com.financeiro.domain.enums.BillType.PAYABLE
                            ? com.financeiro.domain.enums.CategoryType.EXPENSE
                            : com.financeiro.domain.enums.CategoryType.INCOME);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        Bill bill = billRepository.save(Bill.builder()
                .household(householdRepository.getReferenceById(householdId))
                .account(account)
                .category(category)
                .type(request.type())
                .description(request.description().trim())
                .totalAmount(request.totalAmount())
                .installmentCount(request.installmentCount())
                .firstDueDate(request.firstDueDate())
                .createdBy(user)
                .notes(request.notes())
                .build());

        installmentRepository.saveAll(buildInstallments(bill));
        return get(householdId, bill.getId());
    }

    @Transactional
    public BillRequest.Response update(Long householdId, Long billId, BillRequest request) {
        Bill bill = requireScoped(householdId, billId);

        long paid = installmentRepository.countByBillIdAndPaidAtIsNotNull(billId);
        if (paid > 0) {
            throw new BusinessRuleException("Nao e possivel editar um compromisso com parcelas ja pagas");
        }

        if (request.installmentCount() != bill.getInstallmentCount()
                || request.totalAmount().compareTo(bill.getTotalAmount()) != 0
                || !request.firstDueDate().equals(bill.getFirstDueDate())) {
            throw new BusinessRuleException(
                    "Para alterar valor, parcelas ou primeiro vencimento, exclua o compromisso e crie outro");
        }

        Account account = accountService.requireScoped(householdId, request.accountId());
        Category category = null;
        if (request.categoryId() != null) {
            category = categoryService.requireScoped(householdId, request.categoryId(),
                    request.type() == com.financeiro.domain.enums.BillType.PAYABLE
                            ? com.financeiro.domain.enums.CategoryType.EXPENSE
                            : com.financeiro.domain.enums.CategoryType.INCOME);
        }

        bill.setAccount(account);
        bill.setCategory(category);
        bill.setType(request.type());
        bill.setDescription(request.description().trim());
        bill.setNotes(request.notes());
        billRepository.save(bill);

        return get(householdId, billId);
    }

    @Transactional
    public void delete(Long householdId, Long billId) {
        Bill bill = requireScoped(householdId, billId);

        List<BillInstallment> installments = installmentRepository.findByBillIdOrderByNumberAsc(billId);
        List<Long> transactionIds = installments.stream()
                .map(BillInstallment::getTransactionId)
                .filter(java.util.Objects::nonNull)
                .toList();

        if (!transactionIds.isEmpty()) {
            transactionRepository.deleteAll(transactionRepository.findByIdInAndHouseholdId(transactionIds, householdId));
        }
        installmentRepository.deleteAll(installments);
        billRepository.delete(bill);
    }

    /** Registra o pagamento da parcela e cria a movimentacao correspondente. */
    @Transactional
    public BillRequest.Response payInstallment(Long householdId, Long userId, Long installmentId, LocalDate paidAt) {
        BillInstallment installment = installmentRepository.findByIdAndHouseholdId(installmentId, householdId)
                .orElseThrow(() -> new NotFoundException("Parcela nao encontrada"));

        if (installment.isPaid()) {
            throw new BusinessRuleException("Esta parcela ja foi paga");
        }

        LocalDate effectiveDate = paidAt == null ? LocalDate.now() : paidAt;
        if (effectiveDate.isAfter(LocalDate.now())) {
            throw new BusinessRuleException("A data do pagamento nao pode ser futura");
        }

        Bill bill = installment.getBill();
        if (bill.getAccount() != null && !bill.getAccount().isActive()) {
            throw new BusinessRuleException("A conta do compromisso esta inativa");
        }

        if (installment.getAmount().signum() > 0) {
            TransactionType type = paymentType(bill);

            TransactionEntry payment = transactionRepository.save(TransactionEntry.builder()
                    .household(householdRepository.getReferenceById(householdId))
                    .account(bill.getAccount())
                    .category(bill.getCategory())
                    .type(type)
                    .amount(installment.getAmount())
                    .description(bill.getDescription())
                    .notes("Parcela " + installment.getNumber() + " de " + bill.getInstallmentCount())
                    .entryDate(effectiveDate)
                    .installmentId(installment.getId())
                    .createdBy(requireUser(userId))
                    .build());

            installment.setTransactionId(payment.getId());
        }

        installment.setPaidAt(Instant.now());
        installmentRepository.save(installment);

        return get(householdId, bill.getId());
    }

    @Transactional
    public BillRequest.Response unpayInstallment(Long householdId, Long installmentId) {
        BillInstallment installment = installmentRepository.findByIdAndHouseholdId(installmentId, householdId)
                .orElseThrow(() -> new NotFoundException("Parcela nao encontrada"));

        if (!installment.isPaid()) {
            throw new BusinessRuleException("Esta parcela nao esta paga");
        }

        if (installment.getTransactionId() != null) {
            transactionRepository.deleteAll(
                    transactionRepository.findByIdInAndHouseholdId(List.of(installment.getTransactionId()), householdId));
        }

        installment.setPaidAt(null);
        installment.setTransactionId(null);
        installmentRepository.save(installment);

        return get(householdId, installment.getBill().getId());
    }

    @Transactional
    public BillRequest.Response toggleInstallment(Long householdId, Long userId, Long installmentId, LocalDate paidAt) {
        BillInstallment installment = installmentRepository.findByIdAndHouseholdId(installmentId, householdId)
                .orElseThrow(() -> new NotFoundException("Parcela nao encontrada"));
        return installment.isPaid()
                ? unpayInstallment(householdId, installmentId)
                : payInstallment(householdId, userId, installmentId, paidAt);
    }

    public Bill requireScoped(Long householdId, Long billId) {
        return billRepository.findScopedWithCategory(billId, householdId)
                .orElseThrow(() -> new NotFoundException("Compromisso nao encontrado"));
    }

    /**
     * Reparte o total em N parcelas. A diferenca de arredondamento vai para a
     * ultima parcela, garantindo que a soma seja exatamente o total informado.
     */
    private List<BillInstallment> buildInstallments(Bill bill) {
        List<BigDecimal> amounts = splitAmount(bill.getTotalAmount(), bill.getInstallmentCount());

        List<BillInstallment> installments = new ArrayList<>(amounts.size());
        for (int i = 0; i < amounts.size(); i++) {
            installments.add(BillInstallment.builder()
                    .bill(bill)
                    .household(bill.getHousehold())
                    .number(i + 1)
                    .amount(amounts.get(i))
                    .dueDate(bill.getFirstDueDate().plusMonths(i))
                    .build());
        }
        return installments;
    }

    /**
     * Reparte um total em N parcelas de centavos, sem perder nem inventar
     * centavos. As primeiras parcelas recebem os centavos restantes.
     */
    static List<BigDecimal> splitAmount(BigDecimal total, int count) {
        long totalCents = total.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
        long baseCents = Math.floorDiv(totalCents, count);
        long remainder = totalCents - (baseCents * count);

        List<BigDecimal> amounts = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            long partCents = baseCents + (i < remainder ? 1 : 0);
            amounts.add(BigDecimal.valueOf(partCents, 2));
        }
        return amounts;
    }

    /**
     * Tipo da movimentacao gerada pelo pagamento da parcela.
     * Em conta normal, pagar e despesa e receber e receita. No cartao de
     * credito o sinal e invertido: pagar a fatura reduz a divida (entrada) e
     * receber pelo cartado e uma compra (despesa).
     */
    private TransactionType paymentType(Bill bill) {
        boolean credit = bill.getAccount() != null
                && bill.getAccount().getType() == com.financeiro.domain.enums.AccountType.CREDIT_CARD;
        boolean payable = bill.getType() == com.financeiro.domain.enums.BillType.PAYABLE;
        if (credit) {
            return payable ? TransactionType.INCOME : TransactionType.EXPENSE;
        }
        return payable ? TransactionType.EXPENSE : TransactionType.INCOME;
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }
}
