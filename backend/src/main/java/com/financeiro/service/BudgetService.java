package com.financeiro.service;

import com.financeiro.domain.Budget;
import com.financeiro.domain.Category;
import com.financeiro.domain.TransactionEntry;
import com.financeiro.domain.enums.CategoryType;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.ConflictException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.BudgetRepository;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.web.dto.BudgetRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final TransactionRepository transactionRepository;
    private final HouseholdRepository householdRepository;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    public List<BudgetRequest.Response> list(Long householdId, YearMonth month) {
        YearMonth target = month == null ? YearMonth.now() : month;
        return buildResponses(householdId, target, spentByCategory(householdId, target));
    }

    @Transactional
    public BudgetRequest.Response create(Long householdId, BudgetRequest request) {
        Category category = requireExpenseCategory(householdId, request.categoryId());

        LocalDate monthStart = request.month().atDay(1);
        budgetRepository.findByHouseholdIdAndCategoryIdAndMonth(householdId, category.getId(), monthStart)
                .ifPresent(existing -> {
                    throw new ConflictException("Ja existe um orcamento para esta categoria neste mes");
                });

        Budget budget = budgetRepository.save(Budget.builder()
                .household(householdRepository.getReferenceById(householdId))
                .category(category)
                .month(monthStart)
                .amountLimit(request.amountLimit())
                .build());

        return BudgetRequest.Response.from(budget, spentFor(householdId, category.getId(), request.month()));
    }

    @Transactional
    public BudgetRequest.Response update(Long householdId, Long budgetId, BudgetRequest request) {
        Budget budget = requireScoped(householdId, budgetId);
        Category category = requireExpenseCategory(householdId, request.categoryId());

        YearMonth month = YearMonth.from(budget.getMonth());
        if (!category.getId().equals(budget.getCategory().getId())) {
            budgetRepository.findByHouseholdIdAndCategoryIdAndMonth(householdId, category.getId(), month.atDay(1))
                    .ifPresent(existing -> {
                        throw new ConflictException("Ja existe um orcamento para esta categoria neste mes");
                    });
        }

        budget.setCategory(category);
        budget.setAmountLimit(request.amountLimit());
        budgetRepository.save(budget);

        return BudgetRequest.Response.from(budget, spentFor(householdId, category.getId(), month));
    }

    @Transactional
    public void delete(Long householdId, Long budgetId) {
        budgetRepository.delete(requireScoped(householdId, budgetId));
    }

    /** Copia todas as metas de um mes para o mes seguinte. */
    @Transactional
    public int copyFromPreviousMonth(Long householdId, YearMonth target) {
        YearMonth source = target.minusMonths(1);
        List<Budget> previous = budgetRepository.findByMonthWithCategory(householdId, source.atDay(1));
        if (previous.isEmpty()) {
            throw new BusinessRuleException("Nao ha orcamentos no mes anterior");
        }

        int copied = 0;
        for (Budget origin : previous) {
            boolean exists = budgetRepository
                    .findByHouseholdIdAndCategoryIdAndMonth(householdId, origin.getCategory().getId(), target.atDay(1))
                    .isPresent();
            if (exists) {
                continue;
            }
            budgetRepository.save(Budget.builder()
                    .household(householdRepository.getReferenceById(householdId))
                    .category(origin.getCategory())
                    .month(target.atDay(1))
                    .amountLimit(origin.getAmountLimit())
                    .build());
            copied++;
        }
        return copied;
    }

    private Category requireExpenseCategory(Long householdId, Long categoryId) {
        Category category = categoryService.requireScoped(householdId, categoryId);
        if (category.getType() != CategoryType.EXPENSE) {
            throw new BusinessRuleException("Orcamentos so podem ser definidos para categorias de despesa");
        }
        if (!category.isActive()) {
            throw new BusinessRuleException("A categoria '" + category.getName() + "' esta inativa");
        }
        return category;
    }

    private List<BudgetRequest.Response> buildResponses(Long householdId, YearMonth month,
                                                        Map<Long, BigDecimal> spentByCategory) {
        return budgetRepository.findByMonthWithCategory(householdId, month.atDay(1)).stream()
                .map(budget -> BudgetRequest.Response.from(
                        budget,
                        spentByCategory.getOrDefault(budget.getCategory().getId(), BigDecimal.ZERO)))
                .toList();
    }

    private Map<Long, BigDecimal> spentByCategory(Long householdId, YearMonth month) {
        List<Object[]> rows = transactionRepository.sumByCategoryAndPeriod(
                householdId,
                TransactionType.EXPENSE,
                month.atDay(1),
                month.atEndOfMonth());

        return rows.stream().collect(Collectors.toMap(
                row -> (Long) row[0],
                row -> toBigDecimal(row[3])));
    }

    private BigDecimal spentFor(Long householdId, Long categoryId, YearMonth month) {
        return toBigDecimal(transactionRepository.sumByCategoryAndPeriod(
                householdId,
                TransactionType.EXPENSE,
                month.atDay(1),
                month.atEndOfMonth()).stream()
                .filter(row -> categoryId.equals(row[0]))
                .map(row -> toBigDecimal(row[3]))
                .findFirst()
                .orElse(BigDecimal.ZERO));
    }

    private static BigDecimal toBigDecimal(Object value) {
        return value == null ? BigDecimal.ZERO : new BigDecimal(value.toString());
    }

    public Budget requireScoped(Long householdId, Long budgetId) {
        return budgetRepository.findById(budgetId)
                .filter(b -> b.getHousehold().getId().equals(householdId))
                .orElseThrow(() -> new NotFoundException("Orcamento nao encontrado"));
    }
}
