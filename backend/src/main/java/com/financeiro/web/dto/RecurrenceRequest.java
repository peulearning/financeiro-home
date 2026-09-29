package com.financeiro.web.dto;

import com.financeiro.domain.Recurrence;
import com.financeiro.domain.enums.RecurrenceFrequency;
import com.financeiro.domain.enums.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

public record RecurrenceRequest(
        @NotNull(message = "Selecione a conta")
        Long accountId,

        Long categoryId,

        @NotNull(message = "Selecione receita ou despesa")
        TransactionType type,

        @NotNull(message = "Informe o valor")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
        @Digits(integer = 13, fraction = 2)
        BigDecimal amount,

        @NotBlank(message = "Informe a descricao")
        @Size(max = 180)
        String description,

        @NotNull(message = "Selecione a frequencia")
        RecurrenceFrequency frequency,

        @NotNull(message = "Informe a data de inicio")
        LocalDate startDate,

        LocalDate endDate,

        @Min(value = 1, message = "Dia deve estar entre 1 e 31")
        @Max(value = 31, message = "Dia deve estar entre 1 e 31")
        Integer dayOfMonth,

        @Min(value = 1, message = "Dia da semana deve estar entre 1 (seg) e 7 (dom)")
        @Max(value = 7, message = "Dia da semana deve estar entre 1 (seg) e 7 (dom)")
        Integer weekday
) {
    public record Response(
            Long id,
            Long accountId,
            String accountName,
            Long categoryId,
            String categoryName,
            TransactionType type,
            BigDecimal amount,
            String description,
            RecurrenceFrequency frequency,
            LocalDate startDate,
            LocalDate endDate,
            Integer dayOfMonth,
            Integer weekday,
            boolean active,
            LocalDate lastGeneratedAt,
            Instant createdAt
    ) {
        public static Response from(Recurrence r) {
            return new Response(
                    r.getId(),
                    r.getAccount().getId(),
                    r.getAccount().getName(),
                    r.getCategory() == null ? null : r.getCategory().getId(),
                    r.getCategory() == null ? null : r.getCategory().getName(),
                    r.getType(),
                    r.getAmount(),
                    r.getDescription(),
                    r.getFrequency(),
                    r.getStartDate(),
                    r.getEndDate(),
                    r.getDayOfMonth(),
                    r.getWeekday(),
                    r.isActive(),
                    r.getLastGeneratedAt(),
                    r.getCreatedAt());
        }
    }
}
