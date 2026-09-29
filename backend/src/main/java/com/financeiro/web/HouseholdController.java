package com.financeiro.web;

import com.financeiro.domain.HouseholdInvite;
import com.financeiro.security.CurrentUser;
import com.financeiro.service.HouseholdService;
import com.financeiro.web.dto.HouseholdResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/household")
@RequiredArgsConstructor
public class HouseholdController {

    private final HouseholdService householdService;
    private final CurrentUser currentUser;

    @GetMapping
    public HouseholdResponse get() {
        return householdService.get(currentUser.householdId());
    }

    @PatchMapping
    public HouseholdResponse rename(@Valid @RequestBody RenameRequest request) {
        return householdService.rename(currentUser.householdId(), request.name());
    }

    @GetMapping("/invites")
    public List<HouseholdInvite.InviteResponse> listInvites() {
        return householdService.listInvites(currentUser.householdId());
    }

    @PostMapping("/invites")
    public ResponseEntity<HouseholdInvite.InviteResponse> createInvite() {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(householdService.createInvite(currentUser.householdId(), currentUser.userId()));
    }

    @DeleteMapping("/invites/{inviteId}")
    public ResponseEntity<Void> revokeInvite(@PathVariable Long inviteId) {
        householdService.revokeInvite(currentUser.householdId(), inviteId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/join")
    public HouseholdResponse join(@Valid @RequestBody JoinRequest request) {
        return householdService.joinWithCode(currentUser.userId(), request.code());
    }

    @DeleteMapping("/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long userId) {
        householdService.removeMember(currentUser.householdId(), currentUser.userId(), userId);
        return ResponseEntity.noContent().build();
    }

    public record RenameRequest(
            @NotBlank(message = "Informe o nome")
            @Size(max = 120)
            String name
    ) {
    }

    public record JoinRequest(
            @NotBlank(message = "Informe o codigo")
            @Size(max = 12)
            String code
    ) {
    }
}
