package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.BudgetService;
import com.financeiro.web.dto.BudgetRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/budgets")
@RequiredArgsConstructor
public class BudgetController {

    private final BudgetService budgetService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<BudgetRequest.Response> list(@RequestParam(required = false) YearMonth month) {
        return budgetService.list(currentUser.householdId(), month);
    }

    @PostMapping
    public ResponseEntity<BudgetRequest.Response> create(@Valid @RequestBody BudgetRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(budgetService.create(currentUser.householdId(), request));
    }

    @PutMapping("/{id}")
    public BudgetRequest.Response update(@PathVariable Long id, @Valid @RequestBody BudgetRequest request) {
        return budgetService.update(currentUser.householdId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        budgetService.delete(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/copy-previous")
    public Map<String, Object> copyPrevious(@RequestParam(required = false) YearMonth month) {
        YearMonth target = month == null ? YearMonth.now() : month;
        int copied = budgetService.copyFromPreviousMonth(currentUser.householdId(), target);
        return Map.of("copied", copied);
    }
}
