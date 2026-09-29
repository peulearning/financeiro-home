package com.financeiro.repository;

import com.financeiro.domain.HouseholdInvite;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HouseholdInviteRepository extends JpaRepository<HouseholdInvite, Long> {

    Optional<HouseholdInvite> findByCode(String code);

    boolean existsByCode(String code);

    List<HouseholdInvite> findByHouseholdIdOrderByCreatedAtDesc(Long householdId);
}
