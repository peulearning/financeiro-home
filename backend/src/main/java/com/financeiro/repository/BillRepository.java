package com.financeiro.repository;

import com.financeiro.domain.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BillRepository extends JpaRepository<Bill, Long> {

    List<Bill> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);

    @Query("""
            select b from Bill b
            left join fetch b.category
            where b.id = :id and b.household.id = :householdId
            """)
    Optional<Bill> findScopedWithCategory(@Param("id") Long id, @Param("householdId") Long householdId);

    @Query("""
            select b from Bill b
            where b.household.id = :householdId
            """)
    List<Bill> findAllScoped(@Param("householdId") Long householdId);
}
