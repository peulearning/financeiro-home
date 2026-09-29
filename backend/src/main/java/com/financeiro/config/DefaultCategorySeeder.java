package com.financeiro.config;

import com.financeiro.domain.Category;
import com.financeiro.domain.Household;
import com.financeiro.domain.enums.CategoryType;
import com.financeiro.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Cria as categorias padrao quando um espaco compartilhado e criado.
 * Nao sobrescreve nada: apenas completa o que faltar.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DefaultCategorySeeder {

    private final CategoryRepository categoryRepository;

    @Value("${app.seed.default-categories:true}")
    private boolean enabled;

    private record Seed(CategoryType type, String name, String color, String icon) {
    }

    private static final List<Seed> EXPENSES = List.of(
            new Seed(CategoryType.EXPENSE, "Moradia", "#6366f1", "home"),
            new Seed(CategoryType.EXPENSE, "Alimentacao", "#f97316", "utensils"),
            new Seed(CategoryType.EXPENSE, "Transporte", "#0ea5e9", "car"),
            new Seed(CategoryType.EXPENSE, "Saude", "#ef4444", "heart-pulse"),
            new Seed(CategoryType.EXPENSE, "Educacao", "#8b5cf6", "graduation-cap"),
            new Seed(CategoryType.EXPENSE, "Lazer", "#ec4899", "clapperboard"),
            new Seed(CategoryType.EXPENSE, "Vestuario", "#a855f7", "shirt"),
            new Seed(CategoryType.EXPENSE, "Servicos", "#14b8a6", "wrench"),
            new Seed(CategoryType.EXPENSE, "Assinaturas", "#f59e0b", "repeat"),
            new Seed(CategoryType.EXPENSE, "Impostos", "#64748b", "receipt"),
            new Seed(CategoryType.EXPENSE, "Pets", "#84cc16", "paw-print"),
            new Seed(CategoryType.EXPENSE, "Outros", "#94a3b8", "circle-ellipsis"));

    private static final List<Seed> INCOMES = List.of(
            new Seed(CategoryType.INCOME, "Salario", "#22c55e", "briefcase"),
            new Seed(CategoryType.INCOME, "13o e FERIAS", "#10b981", "calendar-days"),
            new Seed(CategoryType.INCOME, "Freelance", "#06b6d4", "laptop"),
            new Seed(CategoryType.INCOME, "Investimentos", "#84cc16", "trending-up"),
            new Seed(CategoryType.INCOME, "Aluguel recebido", "#eab308", "key-round"),
            new Seed(CategoryType.INCOME, "Presente", "#f472b6", "gift"),
            new Seed(CategoryType.INCOME, "Reembolso", "#64748b", "rotate-ccw"),
            new Seed(CategoryType.INCOME, "Outros", "#22c55e", "circle-ellipsis"));

    @Transactional(propagation = Propagation.REQUIRED)
    public void seedFor(Household household) {
        if (!enabled) {
            return;
        }

        List<Category> existing = categoryRepository.findByHouseholdIdOrderByNameAsc(household.getId());
        List<Category> missing = new ArrayList<>();

        for (Seed seed : allSeeds()) {
            boolean found = existing.stream().anyMatch(c ->
                    c.getType() == seed.type() && c.getName().equalsIgnoreCase(seed.name()));
            if (!found) {
                missing.add(Category.builder()
                        .household(household)
                        .name(seed.name())
                        .type(seed.type())
                        .color(seed.color())
                        .icon(seed.icon())
                        .active(true)
                        .build());
            }
        }

        if (!missing.isEmpty()) {
            categoryRepository.saveAll(missing);
            log.info("{} categorias padrao criadas para o espaco {}", missing.size(), household.getId());
        }
    }

    private List<Seed> allSeeds() {
        List<Seed> all = new ArrayList<>(EXPENSES);
        all.addAll(INCOMES);
        return all;
    }
}
