package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.RecurrenceService;
import com.financeiro.web.dto.RecurrenceRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recurrences")
@RequiredArgsConstructor
public class RecurrenceController {

    private final RecurrenceService recurrenceService;
    private final CurrentUser currentUser;

    @GetMapping
    public List<RecurrenceRequest.Response> list() {
        return recurrenceService.list(currentUser.householdId());
    }

    @PostMapping
    public ResponseEntity<RecurrenceRequest.Response> create(@Valid @RequestBody RecurrenceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(recurrenceService.create(currentUser.householdId(), currentUser.userId(), request));
    }

    @PutMapping("/{id}")
    public RecurrenceRequest.Response update(@PathVariable Long id, @Valid @RequestBody RecurrenceRequest request) {
        return recurrenceService.update(currentUser.householdId(), id, request);
    }

    @PatchMapping("/{id}/active")
    public RecurrenceRequest.Response setActive(@PathVariable Long id, @RequestParam boolean active) {
        return recurrenceService.setActive(currentUser.householdId(), id, active);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        recurrenceService.delete(currentUser.householdId(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/generate")
    public Map<String, Object> generate(@PathVariable Long id,
                                       @RequestParam(required = false)
                                       @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate until) {
        int created = recurrenceService.generatePending(
                currentUser.householdId(), id, until == null ? LocalDate.now() : until);
        return Map.of("created", created);
    }

    @PostMapping("/generate")
    public Map<String, Object> generateAll(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate until) {
        int created = recurrenceService.generateAll(
                currentUser.householdId(), until == null ? LocalDate.now() : until);
        return Map.of("created", created);
    }
}
