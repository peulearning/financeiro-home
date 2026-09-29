package com.financeiro.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public record DashboardResponse(
        YearMonth month,
        BigDecimal totalIncome,
        BigDecimal totalExpense,
        BigDecimal balance,
        double savingsRate,
        BigDecimal accountTotal,
        BigDecimal creditTotal,
        BigDecimal creditLimit,
        BigDecimal creditAvailable,
        int pendingBills,
        BigDecimal pendingBillsAmount,
        int overdueBills,
        BigDecimal overdueAmount,
        List<CategoryShare> expensesByCategory,
        List<CategoryShare> incomeByCategory,
        List<AccountBalance> accounts,
        List<MonthlyPoint> trend,
        List<BudgetRequest.Response> budgets,
        List<BillRequest.InstallmentResponse> upcomingBills
) {
    public record CategoryShare(
            Long categoryId,
            String name,
            String color,
            BigDecimal amount,
            double percent,
            long transactions
    ) {
    }

    public record AccountBalance(
            Long id,
            String name,
            String type,
            String color,
            BigDecimal balance,
            BigDecimal creditLimit,
            BigDecimal availableCredit
    ) {
    }

    public record MonthlyPoint(
            YearMonth month,
            BigDecimal income,
            BigDecimal expense,
            BigDecimal balance
    ) {
    }

    /** Atalho para o front consumir a partir de um mes ja resolvido. */
    public static LocalDate resolveMonthStart(YearMonth month) {
        return month == null ? YearMonth.now().atDay(1) : month.atDay(1);
    }
}
