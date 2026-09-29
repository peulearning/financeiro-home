package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.BillService;
import com.financeiro.web.dto.BillRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/bills")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<BillRequest.Response> list() {
        return billService.list(currentUser.householdId());
    }

    @GetMapping("/{id}")
    public BillRequest.Response get(@PathVariable Long id) {
        return billService.get(currentUser.householdId(), id);
    }

    @PostMapping
    public ResponseEntity<BillRequest.Response> create(@Valid @RequestBody BillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(billService.create(currentUser.householdId(), currentUser.userId(), request));
    }

    @PutMapping("/{id}")
    public BillRequest.Response update(@PathVariable Long id, @Valid @RequestBody BillRequest request) {
        return billService.update(currentUser.householdId(), id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        billService.delete(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/installments/{installmentId}/pay")
    public BillRequest.Response pay(@PathVariable Long installmentId,
                                    @RequestBody(required = false) BillRequest.PayRequest request) {
        LocalDate paidAt = request == null ? null : request.paidAt();
        return billService.payInstallment(
                currentUser.householdId(), currentUser.userId(), installmentId, paidAt);
    }

    @PostMapping("/installments/{installmentId}/unpay")
    public BillRequest.Response unpay(@PathVariable Long installmentId) {
        return billService.unpayInstallment(currentUser.householdId(), installmentId);
    }

    @PostMapping("/installments/{installmentId}/toggle")
    public BillRequest.Response toggle(@PathVariable Long installmentId,
                                       @RequestParam(required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate paidAt) {
        return billService.toggleInstallment(
                currentUser.householdId(), currentUser.userId(), installmentId, paidAt);
    }
}
