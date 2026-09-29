package com.financeiro.repository;

import com.financeiro.domain.Category;
import com.financeiro.domain.enums.CategoryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {

    List<Category> findByHouseholdIdOrderByNameAsc(Long householdId);

    List<Category> findByHouseholdIdAndActiveTrueOrderByNameAsc(Long householdId);

    List<Category> findByHouseholdIdAndTypeAndActiveTrueOrderByNameAsc(Long householdId, CategoryType type);

    Optional<Category> findByIdAndHouseholdId(Long id, Long householdId);

    boolean existsByHouseholdIdAndNameIgnoreCaseAndType(Long householdId, String name, CategoryType type);

    @Query("""
            select c from Category c
            where c.id = :id and c.household.id = :householdId
            """)
    Optional<Category> findScoped(@Param("id") Long id, @Param("householdId") Long householdId);
}
