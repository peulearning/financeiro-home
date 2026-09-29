package com.financeiro.web;

import com.financeiro.domain.enums.TransactionType;
import com.financeiro.security.CurrentUser;
import com.financeiro.service.TransactionService;
import com.financeiro.web.dto.PageResponse;
import com.financeiro.web.dto.TransactionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private static final int MAX_PAGE_SIZE = 200;

    private final TransactionService transactionService;
    private final CurrentUser currentUser;

    @GetMapping
    public PageResponse<TransactionRequest.Response> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long accountId,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) TransactionType type,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size) {

        int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int safePage = Math.max(page, 0);

        var pageable = PageRequest.of(safePage, safeSize,
                Sort.by(Sort.Direction.DESC, "entryDate").and(Sort.by(Sort.Direction.DESC, "id")));

        var result = transactionService.list(
                currentUser.householdId(),
                new TransactionService.Filter(from, to, accountId, categoryId, type, search),
                pageable);

        return PageResponse.of(result);
    }

    @GetMapping("/{id}")
    public TransactionRequest.Response get(@PathVariable Long id) {
        return transactionService.get(currentUser.householdId(), id);
    }

    @PostMapping
    public ResponseEntity<TransactionRequest.Response> create(@Valid @RequestBody TransactionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.create(currentUser.householdId(), currentUser.userId(), request));
    }

    @PostMapping("/transfers")
    public ResponseEntity<List<TransactionRequest.Response>> transfer(
            @Valid @RequestBody TransactionRequest.TransferRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(transactionService.createTransfer(currentUser.householdId(), currentUser.userId(), request));
    }

    @PutMapping("/{id}")
    public TransactionRequest.Response update(@PathVariable Long id,
                                              @Valid @RequestBody TransactionRequest request) {
        return transactionService.update(currentUser.householdId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        transactionService.delete(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }
}
