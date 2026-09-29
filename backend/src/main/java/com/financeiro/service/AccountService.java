package com.financeiro.service;

import com.financeiro.domain.Account;
import com.financeiro.domain.Household;
import com.financeiro.domain.enums.AccountType;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.ConflictException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.AccountRepository;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.web.dto.AccountRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final HouseholdRepository householdRepository;
    private final TransactionRepository transactionRepository;

    @Transactional(readOnly = true)
    public List<AccountRequest.Response> list(Long householdId, boolean includeInactive) {
        List<Account> accounts = includeInactive
                ? accountRepository.findByHouseholdIdOrderByNameAsc(householdId)
                : accountRepository.findByHouseholdIdAndActiveTrueOrderByNameAsc(householdId);
        return accounts.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AccountRequest.Response get(Long householdId, Long accountId) {
        return toResponse(requireScoped(householdId, accountId));
    }

    @Transactional
    public AccountRequest.Response create(Long householdId, AccountRequest request) {
        Household household = householdRepository.getReferenceById(householdId);
        String name = request.name().trim();

        if (accountRepository.existsByHouseholdIdAndNameIgnoreCase(householdId, name)) {
            throw new ConflictException("Ja existe uma conta com este nome");
        }
        validateCreditFields(request);

        Account account = Account.builder()
                .household(household)
                .name(name)
                .type(request.type())
                .openingBalance(request.openingBalance())
                .creditLimit(request.creditLimit())
                .closingDay(request.closingDay())
                .dueDay(request.dueDay())
                .color(request.color())
                .active(true)
                .build();

        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public AccountRequest.Response update(Long householdId, Long accountId, AccountRequest request) {
        Account account = requireScoped(householdId, accountId);
        String name = request.name().trim();

        if (!account.getName().equalsIgnoreCase(name)
                && accountRepository.existsByHouseholdIdAndNameIgnoreCase(householdId, name)) {
            throw new ConflictException("Ja existe uma conta com este nome");
        }
        validateCreditFields(request);

        account.setName(name);
        account.setType(request.type());
        account.setOpeningBalance(request.openingBalance());
        account.setCreditLimit(request.creditLimit());
        account.setClosingDay(request.closingDay());
        account.setDueDay(request.dueDay());
        account.setColor(request.color());

        return toResponse(accountRepository.save(account));
    }

    @Transactional
    public void deactivate(Long householdId, Long accountId) {
        Account account = requireScoped(householdId, accountId);
        long movements = transactionRepository.countByAccountIdForHousehold(accountId, householdId);
        if (movements > 0) {
            account.setActive(false);
            accountRepository.save(account);
        } else {
            accountRepository.delete(account);
        }
    }

    @Transactional
    public AccountRequest.Response reactivate(Long householdId, Long accountId) {
        Account account = requireScoped(householdId, accountId);
        account.setActive(true);
        return toResponse(accountRepository.save(account));
    }

    public Account requireScoped(Long householdId, Long accountId) {
        return accountRepository.findByIdAndHouseholdId(accountId, householdId)
                .orElseThrow(() -> new NotFoundException("Conta nao encontrada"));
    }

    private void validateCreditFields(AccountRequest request) {
        if (request.type() == AccountType.CREDIT_CARD) {
            if (request.creditLimit() == null) {
                throw new BusinessRuleException("Informe o limite do cartao de credito");
            }
            if (request.creditLimit().signum() <= 0) {
                throw new BusinessRuleException("O limite do cartao deve ser maior que zero");
            }
        }
        if (request.type() != AccountType.CREDIT_CARD && request.creditLimit() != null) {
            throw new BusinessRuleException("Limite de credito so se aplica a cartoes de credito");
        }
    }

    private AccountRequest.Response toResponse(Account account) {
        BigDecimal change = accountRepository.calculateBalanceChange(account.getId());
        BigDecimal balance = account.getOpeningBalance().add(change == null ? BigDecimal.ZERO : change);
        return AccountRequest.Response.from(account, balance);
    }
}
