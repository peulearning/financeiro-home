package com.financeiro.repository;

import com.financeiro.domain.Recurrence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RecurrenceRepository extends JpaRepository<Recurrence, Long> {

    List<Recurrence> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);

    List<Recurrence> findByHouseholdIdAndActiveTrue(Long householdId);

    Optional<Recurrence> findByIdAndHouseholdId(Long id, Long householdId);

    @Query("""
            select r from Recurrence r
            where r.household.id = :householdId
              and r.active = true
              and r.startDate <= :until
              and (r.endDate is null or r.endDate >= :from)
              and (r.lastGeneratedAt is null or r.lastGeneratedAt < :until)
            order by r.id
            """)
    List<Recurrence> findPending(@Param("householdId") Long householdId,
                                 @Param("from") LocalDate from,
                                 @Param("until") LocalDate until);
}
