package com.financeiro.security;

import com.financeiro.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CurrentUser {

    public AuthUser require() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUser authUser)) {
            throw new UnauthorizedException("Sessao expirada. Faca login novamente.");
        }
        return authUser;
    }

    public Long userId() {
        return require().getUserId();
    }

    public Long householdId() {
        return require().getHouseholdId();
    }
}
