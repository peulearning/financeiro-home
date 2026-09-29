package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.AccountService;
import com.financeiro.web.dto.AccountRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<AccountRequest.Response> list(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return accountService.list(currentUser.householdId(), includeInactive);
    }

    @GetMapping("/{id}")
    public AccountRequest.Response get(@PathVariable Long id) {
        return accountService.get(currentUser.householdId(), id);
    }

    @PostMapping
    public ResponseEntity<AccountRequest.Response> create(@Valid @RequestBody AccountRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(accountService.create(currentUser.householdId(), request));
    }

    @PutMapping("/{id}")
    public AccountRequest.Response update(@PathVariable Long id, @Valid @RequestBody AccountRequest request) {
        return accountService.update(currentUser.householdId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivate(@PathVariable Long id) {
        accountService.deactivate(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/reactivate")
    public AccountRequest.Response reactivate(@PathVariable Long id) {
        return accountService.reactivate(currentUser.householdId(), id);
    }
}
