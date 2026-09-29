package com.financeiro.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class BillServiceSplitTest {

    @Test
    @DisplayName("Divide exatamente quando o total e multiplo")
    void divideExato() {
        List<BigDecimal> parts = BillService.splitAmount(new BigDecimal("100.00"), 4);

        assertThat(parts).containsExactly(
                new BigDecimal("25.00"),
                new BigDecimal("25.00"),
                new BigDecimal("25.00"),
                new BigDecimal("25.00"));
    }

    @Test
    @DisplayName("A soma das parcelas e sempre igual ao total informado")
    void somaIgualAoTotal() {
        List<BigDecimal> casos = List.of(
                new BigDecimal("1000.00"),
                new BigDecimal("999.99"),
                new BigDecimal("10.01"),
                new BigDecimal("123.45"),
                new BigDecimal("0.03"));

        for (BigDecimal total : casos) {
            for (int count = 1; count <= 24; count++) {
                List<BigDecimal> parts = BillService.splitAmount(total, count);

                assertThat(parts)
                        .as("total %s em %d parcelas", total, count)
                        .hasSize(count);
                assertThat(parts.stream().reduce(BigDecimal.ZERO, BigDecimal::add))
                        .as("soma das parcelas de %s em %d", total, count)
                        .isEqualByComparingTo(total);
                assertThat(parts)
                        .as("todas as parcelas tem duas casas")
                        .allSatisfy(part -> assertThat(part.scale()).isLessThanOrEqualTo(2));
            }
        }
    }

    @Test
    @DisplayName("Parcelas nao diferem mais que um centavo entre si")
    void parcelasProximas() {
        List<BigDecimal> parts = BillService.splitAmount(new BigDecimal("100.00"), 3);

        assertThat(parts).containsExactly(
                new BigDecimal("33.34"),
                new BigDecimal("33.33"),
                new BigDecimal("33.33"));
    }
}
