package com.financeiro.repository;

import com.financeiro.domain.BillInstallment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface BillInstallmentRepository extends JpaRepository<BillInstallment, Long> {

    List<BillInstallment> findByBillIdOrderByNumberAsc(Long billId);

    List<BillInstallment> findByBillIdInOrderByDueDateAsc(List<Long> billIds);

    Optional<BillInstallment> findByIdAndHouseholdId(Long id, Long householdId);

    long countByBillIdAndPaidAtIsNotNull(Long billId);

    @Query("""
            select i.bill.id from BillInstallment i
            where i.household.id = :householdId and i.paidAt is not null
            """)
    List<Long> findBillIdsWithPaidInstallment(@Param("householdId") Long householdId);

    @Query("""
            select i.bill.id, i.bill.type, count(i), sum(i.amount)
            from BillInstallment i
            where i.household.id = :householdId
              and i.paidAt is null
              and i.dueDate between :from and :to
            group by i.bill.id, i.bill.type
            """)
    List<Object[]> unpaidSummaryByPeriod(@Param("householdId") Long householdId,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    @Query("""
            select i from BillInstallment i
            join fetch i.bill
            left join fetch i.bill.category
            where i.household.id = :householdId
              and i.paidAt is null
              and i.dueDate between :from and :to
            order by i.dueDate asc
            """)
    List<BillInstallment> unpaidInPeriod(@Param("householdId") Long householdId,
                                         @Param("from") LocalDate from,
                                         @Param("to") LocalDate to);

    /**
     * Parcelas em aberto ate {@code to}, sem limite inferior, para que as
     * parcelas vencidas antes de hoje entrem na contagem de pendencias.
     */
    @Query("""
            select i from BillInstallment i
            join fetch i.bill
            left join fetch i.bill.category
            where i.household.id = :householdId
              and i.paidAt is null
              and i.dueDate <= :to
            order by i.dueDate asc
            """)
    List<BillInstallment> unpaidUntil(@Param("householdId") Long householdId,
                                      @Param("to") LocalDate to);
}
