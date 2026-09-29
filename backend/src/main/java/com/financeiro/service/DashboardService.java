package com.financeiro.service;

import com.financeiro.domain.Account;
import com.financeiro.domain.BillInstallment;
import com.financeiro.domain.enums.AccountType;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.repository.AccountRepository;
import com.financeiro.repository.BillInstallmentRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.web.dto.BillRequest;
import com.financeiro.web.dto.BudgetRequest;
import com.financeiro.web.dto.DashboardResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private static final BigDecimal HUNDRED = BigDecimal.valueOf(100);
    private static final int TREND_MONTHS = 6;
    private static final int UPCOMING_DAYS = 30;

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final BillInstallmentRepository installmentRepository;
    private final BudgetService budgetService;

    @Transactional(readOnly = true)
    public DashboardResponse build(Long householdId, YearMonth requestedMonth) {
        YearMonth month = requestedMonth == null ? YearMonth.now() : requestedMonth;
        LocalDate from = month.atDay(1);
        LocalDate to = month.atEndOfMonth();
        LocalDate today = LocalDate.now();

        BigDecimal income = zeroIfNull(transactionRepository.sumAmountByTypeAndPeriod(
                householdId, TransactionType.INCOME, from, to));
        BigDecimal expense = zeroIfNull(transactionRepository.sumAmountByTypeAndPeriod(
                householdId, TransactionType.EXPENSE, from, to));
        BigDecimal balance = income.subtract(expense);

        double savingsRate = income.signum() == 0
                ? 0
                : balance.multiply(HUNDRED).divide(income, 2, RoundingMode.HALF_UP).doubleValue();

        List<DashboardResponse.AccountBalance> accounts = buildAccountBalances(householdId);
        BigDecimal accountTotal = sumNonCredit(accounts);
        BigDecimal creditUsed = sumCreditUsed(accounts);
        BigDecimal creditLimit = accounts.stream()
                .map(DashboardResponse.AccountBalance::creditLimit)
                .filter(Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal creditAvailable = creditLimit.subtract(creditUsed).max(BigDecimal.ZERO);

        List<BillInstallment> unpaid = installmentRepository.unpaidUntil(householdId, to);
        int overdueCount = 0;
        BigDecimal overdueAmount = BigDecimal.ZERO;
        for (BillInstallment installment : unpaid) {
            if (installment.isOverdue(today)) {
                overdueCount++;
                overdueAmount = overdueAmount.add(installment.getAmount());
            }
        }

        BigDecimal pendingAmount = unpaid.stream()
                .map(BillInstallment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new DashboardResponse(
                month,
                income,
                expense,
                balance,
                savingsRate,
                accountTotal,
                creditUsed,
                creditLimit,
                creditAvailable,
                unpaid.size(),
                pendingAmount,
                overdueCount,
                overdueAmount,
                buildCategoryShares(householdId, TransactionType.EXPENSE, from, to, expense),
                buildCategoryShares(householdId, TransactionType.INCOME, from, to, income),
                accounts,
                buildTrend(householdId, month),
                budgetService.list(householdId, month),
                unpaid.stream()
                        .filter(installment -> !installment.isOverdue(today))
                        .limit(8)
                        .map(BillRequest.InstallmentResponse::from)
                        .toList());
    }

    private List<DashboardResponse.AccountBalance> buildAccountBalances(Long householdId) {
        return accountRepository.findByHouseholdIdAndActiveTrueOrderByNameAsc(householdId).stream()
                .map(account -> {
                    BigDecimal change = zeroIfNull(accountRepository.calculateBalanceChange(account.getId()));
                    BigDecimal balance = account.getOpeningBalance().add(change);
                    BigDecimal available = null;
                    if (account.getCreditLimit() != null) {
                        // No cartao, saldo negativo e divida. Saldo positivo e credor.
                        BigDecimal used = balance.min(BigDecimal.ZERO).abs();
                        available = account.getCreditLimit().subtract(used).max(BigDecimal.ZERO);
                    }
                    return new DashboardResponse.AccountBalance(
                            account.getId(),
                            account.getName(),
                            account.getType().name(),
                            account.getColor(),
                            balance,
                            account.getCreditLimit(),
                            available);
                })
                .toList();
    }

    private List<DashboardResponse.CategoryShare> buildCategoryShares(
            Long householdId, TransactionType type, LocalDate from, LocalDate to, BigDecimal total) {
        return transactionRepository.sumByCategoryAndPeriod(householdId, type, from, to).stream()
                .map(row -> {
                    Long categoryId = (Long) row[0];
                    String name = (String) row[1];
                    String color = (String) row[2];
                    BigDecimal amount = toBigDecimal(row[3]);
                    long count = toBigDecimal(row[4]).longValue();
                    double percent = total.signum() == 0
                            ? 0
                            : amount.multiply(HUNDRED).divide(total, 2, RoundingMode.HALF_UP).doubleValue();
                    return new DashboardResponse.CategoryShare(categoryId, name, color, amount, percent, count);
                })
                .sorted(Comparator.comparing(DashboardResponse.CategoryShare::amount).reversed())
                .toList();
    }

    /** Serie dos ultimos meses, incluindo o mes atual, sempre com todos os meses presentes. */
    private List<DashboardResponse.MonthlyPoint> buildTrend(Long householdId, YearMonth current) {
        YearMonth first = current.minusMonths(TREND_MONTHS - 1L);
        LocalDate from = first.atDay(1);
        LocalDate to = current.atEndOfMonth();

        Map<YearMonth, BigDecimal[]> byMonth = new LinkedHashMap<>();
        for (int i = 0; i < TREND_MONTHS; i++) {
            byMonth.put(first.plusMonths(i), new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
        }

        for (Object[] row : transactionRepository.monthlyTrend(householdId, from, to)) {
            YearMonth key = YearMonth.parse((String) row[0]);
            BigDecimal[] slot = byMonth.get(key);
            if (slot != null) {
                slot[0] = toBigDecimal(row[1]);
                slot[1] = toBigDecimal(row[2]);
            }
        }

        List<DashboardResponse.MonthlyPoint> points = new ArrayList<>(byMonth.size());
        byMonth.forEach((key, value) -> points.add(new DashboardResponse.MonthlyPoint(
                key, value[0], value[1], value[0].subtract(value[1]))));
        return points;
    }

    private BigDecimal sumNonCredit(List<DashboardResponse.AccountBalance> accounts) {
        return accounts.stream()
                .filter(a -> !AccountType.CREDIT_CARD.name().equals(a.type()))
                .map(DashboardResponse.AccountBalance::balance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal sumCreditUsed(List<DashboardResponse.AccountBalance> accounts) {
        return accounts.stream()
                .filter(a -> AccountType.CREDIT_CARD.name().equals(a.type()))
                .map(a -> a.balance().min(BigDecimal.ZERO).abs())
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private static BigDecimal zeroIfNull(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static BigDecimal toBigDecimal(Object value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        if (value instanceof BigDecimal decimal) {
            return decimal;
        }
        if (value instanceof Number number) {
            return BigDecimal.valueOf(number.doubleValue());
        }
        return new BigDecimal(value.toString());
    }
}
