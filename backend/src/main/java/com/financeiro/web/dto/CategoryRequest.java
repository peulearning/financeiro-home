package com.financeiro.web.dto;

import com.financeiro.domain.Category;
import com.financeiro.domain.enums.CategoryType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CategoryRequest(
        @NotBlank(message = "Informe o nome da categoria")
        @Size(max = 120)
        String name,

        @NotNull(message = "Selecione receita ou despesa")
        CategoryType type,

        @Size(max = 20)
        String color,

        @Size(max = 60)
        String icon
) {
    public record Response(
            Long id,
            String name,
            CategoryType type,
            String color,
            String icon,
            boolean active
    ) {
        public static Response from(Category category) {
            return new Response(
                    category.getId(),
                    category.getName(),
                    category.getType(),
                    category.getColor(),
                    category.getIcon(),
                    category.isActive());
        }
    }
}
