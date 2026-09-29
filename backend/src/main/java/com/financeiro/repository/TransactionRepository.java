package com.financeiro.repository;

import com.financeiro.domain.TransactionEntry;
import com.financeiro.domain.enums.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TransactionRepository
        extends JpaRepository<TransactionEntry, Long>, JpaSpecificationExecutor<TransactionEntry> {

    List<TransactionEntry> findByTransferGroupId(UUID transferGroupId);

    List<TransactionEntry> findByIdInAndHouseholdId(List<Long> ids, Long householdId);

    void deleteByIdAndHouseholdId(Long id, Long householdId);

    @Query("""
            select coalesce(sum(t.amount), 0) from TransactionEntry t
            where t.household.id = :householdId
              and t.type = :type
              and t.entryDate between :from and :to
            """)
    BigDecimal sumAmountByTypeAndPeriod(@Param("householdId") Long householdId,
                                        @Param("type") TransactionType type,
                                        @Param("from") LocalDate from,
                                        @Param("to") LocalDate to);

    @Query("""
            select t.category.id, t.category.name, t.category.color, sum(t.amount), count(t)
            from TransactionEntry t
            where t.household.id = :householdId
              and t.type = :type
              and t.entryDate between :from and :to
              and t.category is not null
            group by t.category.id, t.category.name, t.category.color
            order by sum(t.amount) desc
            """)
    List<Object[]> sumByCategoryAndPeriod(@Param("householdId") Long householdId,
                                         @Param("type") TransactionType type,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    @Query("""
            select t.account.id, t.account.name, t.account.type, t.account.color,
                   sum(case
                       when t.type = com.financeiro.domain.enums.TransactionType.INCOME then t.amount
                       when t.type = com.financeiro.domain.enums.TransactionType.EXPENSE then -t.amount
                       when t.transferDirection = com.financeiro.domain.enums.TransferDirection.IN then t.amount
                       else -t.amount end)
            from TransactionEntry t
            where t.household.id = :householdId
              and t.entryDate between :from and :to
            group by t.account.id, t.account.name, t.account.type, t.account.color
            order by sum(case
                       when t.type = com.financeiro.domain.enums.TransactionType.INCOME then t.amount
                       when t.type = com.financeiro.domain.enums.TransactionType.EXPENSE then -t.amount
                       when t.transferDirection = com.financeiro.domain.enums.TransferDirection.IN then t.amount
                       else -t.amount end) desc
            """)

    List<Object[]> movementsByAccountAndPeriod(@Param("householdId") Long householdId,
                                              @Param("from") LocalDate from,
                                              @Param("to") LocalDate to);

    @Query(value = """
            select to_char(date_trunc('month', t.entry_date), 'YYYY-MM') as period,
                   sum(case when t.type = 'INCOME' then t.amount else 0 end) as income,
                   sum(case when t.type = 'EXPENSE' then t.amount else 0 end) as expense
            from transactions t
            where t.household_id = :householdId
              and t.type <> 'TRANSFER'
              and t.entry_date between :from and :to
            group by date_trunc('month', t.entry_date)
            order by date_trunc('month', t.entry_date)
            """, nativeQuery = true)

    List<Object[]> monthlyTrend(@Param("householdId") Long householdId,
                                @Param("from") LocalDate from,
                                @Param("to") LocalDate to);

    Page<TransactionEntry> findByHouseholdId(Long householdId, Pageable pageable);

    long countByAccountIdAndHouseholdId(Long accountId, Long householdId);

    @Query("""
            select count(t) from TransactionEntry t
            where t.account.id = :accountId and t.household.id = :householdId
            """)
    long countByAccountIdForHousehold(@Param("accountId") Long accountId,
                                      @Param("householdId") Long householdId);
}
