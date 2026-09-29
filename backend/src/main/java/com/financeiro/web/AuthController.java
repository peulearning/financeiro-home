package com.financeiro.web;

import com.financeiro.security.CurrentUser;
import com.financeiro.service.AuthService;
import com.financeiro.web.dto.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final CurrentUser currentUser;

    @PostMapping("/register")
    public ResponseEntity<TokenResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ResponseEntity.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(@RequestBody(required = false) Map<String, String> body) {
        authService.logout(body == null ? null : body.get("refreshToken"));
        return ResponseEntity.ok(Map.of("message", "Sessao encerrada"));
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.currentUser(currentUser.userId());
    }

    @PatchMapping("/profile")
    public UserResponse updateProfile(@Valid @RequestBody ProfileRequest request) {
        return authService.updateProfile(currentUser.userId(), request.name());
    }

    public record ProfileRequest(
            @NotBlank(message = "Informe o nome")
            @Size(min = 2, max = 120, message = "O nome deve ter entre 2 e 120 caracteres")
            String name
    ) {
    }
}
