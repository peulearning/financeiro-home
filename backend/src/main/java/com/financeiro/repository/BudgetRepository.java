package com.financeiro.repository;

import com.financeiro.domain.Budget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BudgetRepository extends JpaRepository<Budget, Long> {

    List<Budget> findByHouseholdIdAndMonthOrderByIdAsc(Long householdId, LocalDate month);

    Optional<Budget> findByHouseholdIdAndCategoryIdAndMonth(Long householdId, Long categoryId, LocalDate month);

    @Query("""
            select b from Budget b
            join fetch b.category
            where b.household.id = :householdId and b.month = :month
            """)
    List<Budget> findByMonthWithCategory(@Param("householdId") Long householdId,
                                         @Param("month") LocalDate month);
}
