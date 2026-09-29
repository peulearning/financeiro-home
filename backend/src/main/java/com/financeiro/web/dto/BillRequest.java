package com.financeiro.web.dto;

import com.financeiro.domain.Bill;
import com.financeiro.domain.BillInstallment;
import com.financeiro.domain.enums.BillType;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record BillRequest(
        @NotNull(message = "Selecione a conta")
        Long accountId,

        Long categoryId,

        @NotNull(message = "Selecione a pagar ou a receber")
        BillType type,

        @NotBlank(message = "Informe a descricao")
        @Size(max = 180)
        String description,

        @NotNull(message = "Informe o valor total")
        @DecimalMin(value = "0.01", message = "O valor deve ser maior que zero")
        @Digits(integer = 13, fraction = 2)
        BigDecimal totalAmount,

        @NotNull(message = "Informe a quantidade de parcelas")
        @Min(value = 1, message = "Informe ao menos 1 parcela")
        @Max(value = 480, message = "Informe no maximo 480 parcelas")
        Integer installmentCount,

        @NotNull(message = "Informe o primeiro vencimento")
        LocalDate firstDueDate,

        @Size(max = 5000)
        String notes
) {
    public record Response(
            Long id,
            Long accountId,
            String accountName,
            Long categoryId,
            String categoryName,
            BillType type,
            String description,
            BigDecimal totalAmount,
            Integer installmentCount,
            LocalDate firstDueDate,
            BigDecimal paidAmount,
            BigDecimal remainingAmount,
            long paidInstallments,
            long pendingInstallments,
            LocalDate nextDueDate,
            LocalDate lastDueDate,
            String notes,
            Instant createdAt,
            List<InstallmentResponse> installments
    ) {
        public static Response from(Bill bill, List<BillInstallment> installments) {
            BigDecimal paid = installments.stream()
                    .filter(BillInstallment::isPaid)
                    .map(BillInstallment::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            LocalDate today = LocalDate.now();
            LocalDate nextDue = installments.stream()
                    .filter(i -> !i.isPaid())
                    .map(BillInstallment::getDueDate)
                    .min(LocalDate::compareTo)
                    .orElse(null);

            LocalDate lastDue = installments.stream()
                    .map(BillInstallment::getDueDate)
                    .max(LocalDate::compareTo)
                    .orElse(null);

            long paidCount = installments.stream().filter(BillInstallment::isPaid).count();
            long overdue = installments.stream().filter(i -> i.isOverdue(today)).count();

            return new Response(
                    bill.getId(),
                    bill.getAccount().getId(),
                    bill.getAccount().getName(),
                    bill.getCategory() == null ? null : bill.getCategory().getId(),
                    bill.getCategory() == null ? null : bill.getCategory().getName(),
                    bill.getType(),
                    bill.getDescription(),
                    bill.getTotalAmount(),
                    bill.getInstallmentCount(),
                    bill.getFirstDueDate(),
                    paid,
                    bill.getTotalAmount().subtract(paid).max(BigDecimal.ZERO),
                    paidCount,
                    installments.size() - paidCount,
                    nextDue,
                    lastDue,
                    bill.getNotes(),
                    bill.getCreatedAt(),
                    installments.stream().map(InstallmentResponse::from).toList());
        }
    }

    public record InstallmentResponse(
            Long id,
            Long billId,
            Integer number,
            BigDecimal amount,
            LocalDate dueDate,
            boolean paid,
            Instant paidAt,
            Long transactionId,
            String status
    ) {
        public static InstallmentResponse from(BillInstallment i) {
            LocalDate today = LocalDate.now();
            String status;
            if (i.isPaid()) {
                status = "PAID";
            } else if (i.getDueDate().isBefore(today)) {
                status = "OVERDUE";
            } else if (i.getDueDate().isEqual(today)) {
                status = "DUE_TODAY";
            } else {
                status = "PENDING";
            }
            return new InstallmentResponse(
                    i.getId(),
                    i.getBill().getId(),
                    i.getNumber(),
                    i.getAmount(),
                    i.getDueDate(),
                    i.isPaid(),
                    i.getPaidAt(),
                    i.getTransactionId(),
                    status);
        }
    }

    public record PayRequest(
            LocalDate paidAt
    ) {
    }
}
