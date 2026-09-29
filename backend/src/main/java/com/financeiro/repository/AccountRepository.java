package com.financeiro.repository;

import com.financeiro.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AccountRepository extends JpaRepository<Account, Long> {

    List<Account> findByHouseholdIdOrderByNameAsc(Long householdId);

    List<Account> findByHouseholdIdAndActiveTrueOrderByNameAsc(Long householdId);

    Optional<Account> findByIdAndHouseholdId(Long id, Long householdId);

    boolean existsByHouseholdIdAndNameIgnoreCase(Long householdId, String name);

    @Query("""
            select a from Account a
            where a.id = :id and a.household.id = :householdId
            """)
    Optional<Account> findScoped(@Param("id") Long id, @Param("householdId") Long householdId);

    /**
     * Saldo atual de uma conta: saldo inicial + entradas - saidas.
     * Transferencias usam {@code transfer_direction}: OUT debita, IN credita.
     */
    @Query("""
            select coalesce(sum(case
                when t.type = com.financeiro.domain.enums.TransactionType.INCOME then t.amount
                when t.type = com.financeiro.domain.enums.TransactionType.EXPENSE then -t.amount
                when t.transferDirection = com.financeiro.domain.enums.TransferDirection.IN then t.amount
                else -t.amount end), 0)
            from TransactionEntry t
            where t.account.id = :accountId
            """)
    BigDecimal calculateBalanceChange(@Param("accountId") Long accountId);

    /** Soma dos movimentos no periodo, usado para filtro de saldo inicial. */
    @Query("""
            select coalesce(sum(case
                when t.type = com.financeiro.domain.enums.TransactionType.INCOME then t.amount
                when t.type = com.financeiro.domain.enums.TransactionType.EXPENSE then -t.amount
                when t.transferDirection = com.financeiro.domain.enums.TransferDirection.IN then t.amount
                else -t.amount end), 0)
            from TransactionEntry t
            where t.account.id = :accountId and t.entryDate < :from
            """)
    BigDecimal calculateBalanceChangeBefore(@Param("accountId") Long accountId,
                                            @Param("from") LocalDate from);
}
