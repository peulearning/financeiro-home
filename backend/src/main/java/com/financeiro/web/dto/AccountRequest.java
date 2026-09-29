package com.financeiro.web.dto;

import com.financeiro.domain.Account;
import com.financeiro.domain.enums.AccountType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record AccountRequest(
        @NotBlank(message = "Informe o nome da conta")
        @Size(max = 120)
        String name,

        @NotNull(message = "Selecione o tipo de conta")
        AccountType type,

        @NotNull(message = "Informe o saldo inicial")
        @Digits(integer = 13, fraction = 2, message = "Valor invalido")
        BigDecimal openingBalance,

        @Digits(integer = 13, fraction = 2, message = "Valor invalido")
        BigDecimal creditLimit,

        @Min(value = 1, message = "Dia de fechamento deve estar entre 1 e 31")
        @Max(value = 31, message = "Dia de fechamento deve estar entre 1 e 31")
        Integer closingDay,

        @Min(value = 1, message = "Dia de vencimento deve estar entre 1 e 28")
        @Max(value = 28, message = "Dia de vencimento deve estar entre 1 e 28")
        Integer dueDay,

        @Size(max = 20)
        String color
) {
    public record Response(
            Long id,
            String name,
            AccountType type,
            BigDecimal openingBalance,
            BigDecimal creditLimit,
            Integer closingDay,
            Integer dueDay,
            String color,
            boolean active,
            BigDecimal currentBalance,
            BigDecimal availableCredit
    ) {
        public static Response from(Account account, BigDecimal currentBalance) {
            BigDecimal available = null;
            if (account.getCreditLimit() != null) {
                BigDecimal used = currentBalance.abs();
                available = account.getCreditLimit().subtract(used).max(BigDecimal.ZERO);
            }
            return new Response(
                    account.getId(),
                    account.getName(),
                    account.getType(),
                    account.getOpeningBalance(),
                    account.getCreditLimit(),
                    account.getClosingDay(),
                    account.getDueDay(),
                    account.getColor(),
                    account.isActive(),
                    currentBalance,
                    available);
        }
    }
}
