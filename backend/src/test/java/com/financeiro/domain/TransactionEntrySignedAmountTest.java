package com.financeiro.domain;

import com.financeiro.domain.enums.TransactionType;
import com.financeiro.domain.enums.TransferDirection;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionEntrySignedAmountTest {

    private static final BigDecimal VALOR = new BigDecimal("150.00");

    @Test
    @DisplayName("Receita entra no saldo")
    void receita() {
        assertThat(entry(TransactionType.INCOME, null).signedAmount()).isEqualByComparingTo("150.00");
    }

    @Test
    @DisplayName("Despesa sai do saldo")
    void despesa() {
        assertThat(entry(TransactionType.EXPENSE, null).signedAmount()).isEqualByComparingTo("-150.00");
    }

    @Test
    @DisplayName("Transferencia de saida debita a conta de origem")
    void transferenciaSaida() {
        assertThat(entry(TransactionType.TRANSFER, TransferDirection.OUT).signedAmount())
                .isEqualByComparingTo("-150.00");
    }

    @Test
    @DisplayName("Transferencia de entrada credita a conta de destino")
    void transferenciaEntrada() {
        assertThat(entry(TransactionType.TRANSFER, TransferDirection.IN).signedAmount())
                .isEqualByComparingTo("150.00");
    }

    @Test
    @DisplayName("As duas pontas da transferencia se anulam no consolidado")
    void transferenciaLiquidaZero() {
        BigDecimal liquid = entry(TransactionType.TRANSFER, TransferDirection.OUT).signedAmount()
                .add(entry(TransactionType.TRANSFER, TransferDirection.IN).signedAmount());

        assertThat(liquid).isEqualByComparingTo(BigDecimal.ZERO);
    }

    private TransactionEntry entry(TransactionType type, TransferDirection direction) {
        return TransactionEntry.builder()
                .type(type)
                .amount(VALOR)
                .transferDirection(direction)
                .build();
    }
}
