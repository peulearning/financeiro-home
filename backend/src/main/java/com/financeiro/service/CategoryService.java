package com.financeiro.service;

import com.financeiro.domain.Category;
import com.financeiro.domain.Household;
import com.financeiro.domain.enums.CategoryType;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.ConflictException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.CategoryRepository;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.web.dto.CategoryRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final HouseholdRepository householdRepository;

    @Transactional(readOnly = true)
    public List<CategoryRequest.Response> list(Long householdId, CategoryType type, boolean includeInactive) {
        List<Category> categories;
        if (includeInactive) {
            categories = categoryRepository.findByHouseholdIdOrderByNameAsc(householdId);
        } else if (type != null) {
            categories = categoryRepository.findByHouseholdIdAndTypeAndActiveTrueOrderByNameAsc(householdId, type);
        } else {
            categories = categoryRepository.findByHouseholdIdAndActiveTrueOrderByNameAsc(householdId);
        }
        return categories.stream().map(CategoryRequest.Response::from).toList();
    }

    @Transactional
    public CategoryRequest.Response create(Long householdId, CategoryRequest request) {
        Household household = householdRepository.getReferenceById(householdId);
        String name = request.name().trim();

        if (categoryRepository.existsByHouseholdIdAndNameIgnoreCaseAndType(householdId, name, request.type())) {
            throw new ConflictException("Ja existe uma categoria com este nome para este tipo");
        }

        Category category = Category.builder()
                .household(household)
                .name(name)
                .type(request.type())
                .color(request.color())
                .icon(request.icon())
                .active(true)
                .build();

        return CategoryRequest.Response.from(categoryRepository.save(category));
    }

    @Transactional
    public CategoryRequest.Response update(Long householdId, Long categoryId, CategoryRequest request) {
        Category category = requireScoped(householdId, categoryId);
        String name = request.name().trim();

        boolean typeChanged = category.getType() != request.type();
        if (typeChanged) {
            throw new BusinessRuleException("Nao e possivel trocar o tipo da categoria. Crie uma nova categoria.");
        }
        if (!category.getName().equalsIgnoreCase(name)
                && categoryRepository.existsByHouseholdIdAndNameIgnoreCaseAndType(householdId, name, request.type())) {
            throw new ConflictException("Ja existe uma categoria com este nome para este tipo");
        }

        category.setName(name);
        category.setColor(request.color());
        category.setIcon(request.icon());

        return CategoryRequest.Response.from(categoryRepository.save(category));
    }

    @Transactional
    public void deactivate(Long householdId, Long categoryId) {
        Category category = requireScoped(householdId, categoryId);
        category.setActive(false);
        categoryRepository.save(category);
    }

    @Transactional
    public CategoryRequest.Response reactivate(Long householdId, Long categoryId) {
        Category category = requireScoped(householdId, categoryId);
        category.setActive(true);
        return CategoryRequest.Response.from(categoryRepository.save(category));
    }

    public Category requireScoped(Long householdId, Long categoryId) {
        return categoryRepository.findByIdAndHouseholdId(categoryId, householdId)
                .orElseThrow(() -> new NotFoundException("Categoria nao encontrada"));
    }

    /** Valida que a categoria pertence ao espaco e e do tipo esperado. */
    public Category requireScoped(Long householdId, Long categoryId, CategoryType expectedType) {
        Category category = requireScoped(householdId, categoryId);
        if (category.getType() != expectedType) {
            throw new BusinessRuleException("A categoria '"
                    + category.getName() + "' e de " + label(category.getType())
                    + " e nao pode ser usada em " + label(expectedType).toLowerCase());
        }
        return category;
    }

    private String label(CategoryType type) {
        return type == CategoryType.INCOME ? "receita" : "despesa";
    }
}
