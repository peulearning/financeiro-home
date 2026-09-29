package com.financeiro.web.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "Refresh token obrigatorio")
        String refreshToken
) {
}
