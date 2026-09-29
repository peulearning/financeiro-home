package com.financeiro.security;

import com.financeiro.domain.HouseholdMember;
import com.financeiro.domain.User;
import com.financeiro.repository.HouseholdMemberRepository;
import com.financeiro.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final HouseholdMemberRepository memberRepository;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String token = extractToken(request);
        if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            Long userId = jwtService.parseUserId(token);
            if (userId != null) {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    // O escopo do casal e resolvido do banco a cada requisicao,
                    // garantindo que remocoes de membro sejam aplicadas imediatamente.
                    Long householdId = memberRepository.findByUserId(userId)
                            .map(HouseholdMember::getHousehold)
                            .map(h -> h.getId())
                            .orElse(null);
                    if (householdId != null) {
                        AuthUser principal = new AuthUser(user.getId(), user.getEmail(), user.getName(), householdId);
                        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                                principal, null, principal.getAuthorities());
                        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    }
                }
            }
        }
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String value = header.substring(7).trim();
            return value.isEmpty() ? null : value;
        }
        return null;
    }
}
