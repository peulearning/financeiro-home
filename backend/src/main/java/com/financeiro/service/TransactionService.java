package com.financeiro.service;

import com.financeiro.domain.Account;
import com.financeiro.domain.Category;
import com.financeiro.domain.Household;
import com.financeiro.domain.TransactionEntry;
import com.financeiro.domain.User;
import com.financeiro.domain.enums.CategoryType;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.domain.enums.TransferDirection;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.repository.UserRepository;
import com.financeiro.web.dto.TransactionRequest;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    public record Filter(
            LocalDate from,
            LocalDate to,
            Long accountId,
            Long categoryId,
            TransactionType type,
            String search
    ) {
        public static Filter empty() {
            return new Filter(null, null, null, null, null, null);
        }
    }

    @Transactional(readOnly = true)
    public Page<TransactionRequest.Response> list(Long householdId, Filter filter, Pageable pageable) {
        return transactionRepository.findAll(toSpecification(householdId, filter), pageable)
                .map(TransactionRequest.Response::from);
    }

    @Transactional(readOnly = true)
    public TransactionRequest.Response get(Long householdId, Long id) {
        return TransactionRequest.Response.from(requireScoped(householdId, id));
    }

    @Transactional
    public TransactionRequest.Response create(Long householdId, Long userId, TransactionRequest request) {
        if (request.type() == TransactionType.TRANSFER) {
            throw new BusinessRuleException("Use a operacao de transferencia para movimentar entre contas");
        }

        Account account = accountService.requireScoped(householdId, request.accountId());
        requireActive(account);

        Category category = validateCategory(householdId, request);

        TransactionEntry entry = TransactionEntry.builder()
                .household(requireHousehold(householdId))
                .account(account)
                .category(category)
                .type(request.type())
                .amount(request.amount())
                .description(normalize(request.description()))
                .notes(request.notes())
                .entryDate(request.entryDate())
                .createdBy(requireUser(userId))
                .build();

        return TransactionRequest.Response.from(transactionRepository.save(entry));
    }

    @Transactional
    public List<TransactionRequest.Response> createTransfer(Long householdId, Long userId,
                                                           TransactionRequest.TransferRequest request) {
        if (request.fromAccountId().equals(request.toAccountId())) {
            throw new BusinessRuleException("A conta de origem e destino devem ser diferentes");
        }

        Account from = accountService.requireScoped(householdId, request.fromAccountId());
        Account to = accountService.requireScoped(householdId, request.toAccountId());
        requireActive(from);
        requireActive(to);

        User user = requireUser(userId);
        Household household = requireHousehold(householdId);
        UUID groupId = UUID.randomUUID();
        String description = normalize(request.description());
        if (description == null) {
            description = "Transferencia";
        }

        TransactionEntry out = TransactionEntry.builder()
                .household(household)
                .account(from)
                .type(TransactionType.TRANSFER)
                .transferDirection(TransferDirection.OUT)
                .amount(request.amount())
                .description(description)
                .entryDate(request.entryDate())
                .transferGroupId(groupId)
                .createdBy(user)
                .build();

        TransactionEntry in = TransactionEntry.builder()
                .household(household)
                .account(to)
                .type(TransactionType.TRANSFER)
                .transferDirection(TransferDirection.IN)
                .amount(request.amount())
                .description(description)
                .entryDate(request.entryDate())
                .transferGroupId(groupId)
                .createdBy(user)
                .build();

        transactionRepository.saveAll(List.of(out, in));
        return List.of(
                TransactionRequest.Response.from(out),
                TransactionRequest.Response.from(in));
    }

    @Transactional
    public TransactionRequest.Response update(Long householdId, Long id, TransactionRequest request) {
        TransactionEntry entry = requireScoped(householdId, id);

        if (entry.getType() == TransactionType.TRANSFER) {
            throw new BusinessRuleException("Transferencias nao podem ser editadas. Exclua e faca novamente.");
        }
        if (request.type() == TransactionType.TRANSFER) {
            throw new BusinessRuleException("Nao e possivel transformar uma movimentacao em transferencia");
        }
        if (entry.getInstallmentId() != null) {
            throw new BusinessRuleException("Esta movimentacao veio de uma parcela. Altere a parcela diretamente.");
        }

        Account account = accountService.requireScoped(householdId, request.accountId());
        requireActive(account);
        Category category = validateCategory(householdId, request);

        entry.setAccount(account);
        entry.setCategory(category);
        entry.setType(request.type());
        entry.setAmount(request.amount());
        entry.setDescription(normalize(request.description()));
        entry.setNotes(request.notes());
        entry.setEntryDate(request.entryDate());

        return TransactionRequest.Response.from(transactionRepository.save(entry));
    }

    @Transactional
    public void delete(Long householdId, Long id) {
        TransactionEntry entry = requireScoped(householdId, id);

        if (entry.getInstallmentId() != null) {
            throw new BusinessRuleException("Esta movimentacao veio de uma parcela. Exclua a parcela diretamente.");
        }

        if (entry.getTransferGroupId() != null) {
            // Apagar uma transferencia apaga as duas pontas.
            transactionRepository.deleteAll(transactionRepository.findByTransferGroupId(entry.getTransferGroupId()));
            return;
        }

        transactionRepository.delete(entry);
    }

    public TransactionEntry requireScoped(Long householdId, Long id) {
        return transactionRepository.findById(id)
                .filter(t -> t.getHousehold().getId().equals(householdId))
                .orElseThrow(() -> new NotFoundException("Movimentacao nao encontrada"));
    }

    private void requireActive(Account account) {
        if (!account.isActive()) {
            throw new BusinessRuleException("A conta '" + account.getName() + "' esta inativa");
        }
    }

    private Category validateCategory(Long householdId, TransactionRequest request) {
        if (request.categoryId() == null) {
            return null;
        }
        CategoryType expected = request.type() == TransactionType.INCOME
                ? CategoryType.INCOME
                : CategoryType.EXPENSE;
        Category category = categoryService.requireScoped(householdId, request.categoryId(), expected);
        if (!category.isActive()) {
            throw new BusinessRuleException("A categoria '" + category.getName() + "' esta inativa");
        }
        return category;
    }

    private Household requireHousehold(Long householdId) {
        return householdRepository.findById(householdId)
                .orElseThrow(() -> new NotFoundException("Espaco compartilhado nao encontrado"));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private Specification<TransactionEntry> toSpecification(Long householdId, Filter filter) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("household").get("id"), householdId));

            if (filter.from() != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("entryDate"), filter.from()));
            }
            if (filter.to() != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("entryDate"), filter.to()));
            }
            if (filter.accountId() != null) {
                predicates.add(cb.equal(root.get("account").get("id"), filter.accountId()));
            }
            if (filter.categoryId() != null) {
                predicates.add(cb.equal(root.get("category").get("id"), filter.categoryId()));
            }
            if (filter.type() != null) {
                predicates.add(cb.equal(root.get("type"), filter.type()));
            }
            if (filter.search() != null && !filter.search().isBlank()) {
                Join<TransactionEntry, Category> category = root.join("category", JoinType.LEFT);
                String pattern = "%" + filter.search().trim().toLowerCase(Locale.ROOT) + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("notes")), pattern),
                        cb.like(cb.lower(category.get("name")), pattern)));
            }

            query.distinct(true);
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
