package com.financeiro.repository;

import com.financeiro.domain.HouseholdMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HouseholdMemberRepository extends JpaRepository<HouseholdMember, Long> {

    Optional<HouseholdMember> findByUserId(Long userId);

    List<HouseholdMember> findByHouseholdIdOrderByIdAsc(Long householdId);

    long countByHouseholdId(Long householdId);

    Optional<HouseholdMember> findByHouseholdIdAndUserId(Long householdId, Long userId);

    @Query("""
            select m.household.id from HouseholdMember m
            where m.user.id = :userId
            """)
    List<Long> findHouseholdIdsByUserId(@Param("userId") Long userId);

    @Query("select distinct m.household.id from HouseholdMember m")
    List<Long> findDistinctHouseholdIds();
}
