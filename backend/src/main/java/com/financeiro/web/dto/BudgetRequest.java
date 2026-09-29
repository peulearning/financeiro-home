package com.financeiro.web.dto;

import com.financeiro.domain.Budget;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;

public record BudgetRequest(
        @NotNull(message = "Selecione a categoria")
        Long categoryId,

        @NotNull(message = "Informe o mes de referencia")
        YearMonth month,

        @NotNull(message = "Informe o limite")
        @DecimalMin(value = "0.01", message = "O limite deve ser maior que zero")
        @Digits(integer = 13, fraction = 2)
        BigDecimal amountLimit
) {
    public record Response(
            Long id,
            Long categoryId,
            String categoryName,
            String categoryColor,
            YearMonth month,
            BigDecimal amountLimit,
            BigDecimal spent,
            BigDecimal remaining,
            double percentUsed,
            String status
    ) {
        public static Response from(Budget budget, BigDecimal spent) {
            BigDecimal limit = budget.getAmountLimit();
            BigDecimal remaining = limit.subtract(spent);
            double percent = limit.signum() == 0
                    ? 0
                    : spent.multiply(BigDecimal.valueOf(100))
                            .divide(limit, 2, java.math.RoundingMode.HALF_UP)
                            .doubleValue();

            String status;
            if (percent >= 100) {
                status = "EXCEEDED";
            } else if (percent >= 80) {
                status = "WARNING";
            } else {
                status = "OK";
            }

            return new Response(
                    budget.getId(),
                    budget.getCategory().getId(),
                    budget.getCategory().getName(),
                    budget.getCategory().getColor(),
                    YearMonth.from(budget.getMonth()),
                    limit,
                    spent,
                    remaining,
                    percent,
                    status);
        }
    }

    public static LocalDate firstDayOf(YearMonth month) {
        return month.atDay(1);
    }
}
