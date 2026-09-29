package com.financeiro.web.dto;

import com.financeiro.domain.TransactionEntry;
import com.financeiro.domain.enums.TransactionType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record TransactionRequest(
        @NotNull(message = "Selecione a conta")
        Long accountId,

        Long categoryId,

        @NotNull(message = "Selecione o tipo de movimentacao")
        TransactionType type,

        @NotNull(message = "Informe o valor")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
        @Digits(integer = 13, fraction = 2, message = "Valor invalido")
        BigDecimal amount,

        @Size(max = 255)
        String description,

        @Size(max = 5000)
        String notes,

        @NotNull(message = "Informe a data")
        @PastOrPresent(message = "A data nao pode ser futura")
        LocalDate entryDate
) {
    public record TransferRequest(
            @NotNull(message = "Selecione a conta de origem")
            Long fromAccountId,

            @NotNull(message = "Selecione a conta de destino")
            Long toAccountId,

            @NotNull(message = "Informe o valor")
            @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
            @Digits(integer = 13, fraction = 2)
            BigDecimal amount,

            @Size(max = 255)
            String description,

            @NotNull(message = "Informe a data")
            LocalDate entryDate
    ) {
    }

    public record Response(
            Long id,
            Long accountId,
            String accountName,
            String accountType,
            Long categoryId,
            String categoryName,
            String categoryColor,
            TransactionType type,
            BigDecimal amount,
            BigDecimal signedAmount,
            String description,
            String notes,
            LocalDate entryDate,
            UUID transferGroupId,
            Long createdById,
            String createdByName,
            Instant createdAt
    ) {
        public static Response from(TransactionEntry t) {
            return new Response(
                    t.getId(),
                    t.getAccount().getId(),
                    t.getAccount().getName(),
                    t.getAccount().getType().name(),
                    t.getCategory() == null ? null : t.getCategory().getId(),
                    t.getCategory() == null ? null : t.getCategory().getName(),
                    t.getCategory() == null ? null : t.getCategory().getColor(),
                    t.getType(),
                    t.getAmount(),
                    t.signedAmount(),
                    t.getDescription(),
                    t.getNotes(),
                    t.getEntryDate(),
                    t.getTransferGroupId(),
                    t.getCreatedBy().getId(),
                    t.getCreatedBy().getName(),
                    t.getCreatedAt());
        }
    }
}
