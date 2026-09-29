package com.financeiro.web.dto;

import java.time.Instant;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt,
        UserResponse user,
        HouseholdResponse household
) {
}
