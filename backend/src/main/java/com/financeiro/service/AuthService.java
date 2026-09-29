package com.financeiro.service;

import com.financeiro.domain.Household;
import com.financeiro.domain.HouseholdInvite;
import com.financeiro.domain.HouseholdMember;
import com.financeiro.domain.RefreshToken;
import com.financeiro.domain.User;
import com.financeiro.domain.enums.MemberRole;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.ConflictException;
import com.financeiro.exception.UnauthorizedException;
import com.financeiro.repository.*;
import com.financeiro.security.JwtService;
import com.financeiro.web.dto.HouseholdResponse;
import com.financeiro.web.dto.LoginRequest;
import com.financeiro.web.dto.RefreshRequest;
import com.financeiro.web.dto.RegisterRequest;
import com.financeiro.web.dto.TokenResponse;
import com.financeiro.web.dto.UserResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final HouseholdRepository householdRepository;
    private final HouseholdMemberRepository memberRepository;
    private final HouseholdInviteRepository inviteRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final com.financeiro.config.DefaultCategorySeeder categorySeeder;

    @Transactional
    public TokenResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Ja existe uma conta com este e-mail");
        }

        User user = User.builder()
                .name(request.name().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .build();
        userRepository.save(user);

        Household household;
        HouseholdInvite invite = resolveInvite(request.inviteCode());

        if (invite != null) {
            household = invite.getHousehold();
            invite.setUsedBy(user.getId());
            invite.setUsedAt(Instant.now());
            inviteRepository.save(invite);
            log.info("Usuario {} entrou no espaco compartilhado {}", user.getId(), household.getId());
        } else {
            String name = request.householdName();
            if (name == null || name.isBlank()) {
                throw new BusinessRuleException("Informe o nome do espaco compartilhado ou use um codigo de convite");
            }
            household = householdRepository.save(
                    Household.builder().name(name.trim()).build());
        }

        memberRepository.save(HouseholdMember.builder()
                .household(household)
                .user(user)
                .role(invite == null ? MemberRole.OWNER : invite.getRole())
                .build());

        if (invite == null) {
            categorySeeder.seedFor(household);
        }

        return issueTokens(user, household);
    }

    @Transactional
    public TokenResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UnauthorizedException("E-mail ou senha incorretos"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("E-mail ou senha incorretos");
        }

        Household household = memberRepository.findByUserId(user.getId())
                .map(HouseholdMember::getHousehold)
                .orElseThrow(() -> new BusinessRuleException("Usuario nao pertence a nenhum espaco compartilhado"));

        return issueTokens(user, household);
    }

    @Transactional
    public TokenResponse refresh(RefreshRequest request) {
        String hash = jwtService.hashRefreshToken(request.refreshToken());
        RefreshToken stored = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new UnauthorizedException("Sessao invalida. Faca login novamente."));

        if (!stored.isUsable(Instant.now())) {
            // Reuso de token invalido: derruba todas as sessoes do usuario.
            refreshTokenRepository.deleteByUserId(stored.getUser().getId());
            throw new UnauthorizedException("Sessao expirada. Faca login novamente.");
        }

        stored.setRevokedAt(Instant.now());
        refreshTokenRepository.save(stored);

        Household household = memberRepository.findByUserId(stored.getUser().getId())
                .map(HouseholdMember::getHousehold)
                .orElseThrow(() -> new BusinessRuleException("Usuario nao pertence a nenhum espaco compartilhado"));

        return issueTokens(stored.getUser(), household);
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(jwtService.hashRefreshToken(refreshToken))
                .ifPresent(token -> {
                    token.setRevokedAt(Instant.now());
                    refreshTokenRepository.save(token);
                });
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(Long userId) {
        return userRepository.findById(userId)
                .map(UserResponse::from)
                .orElseThrow(() -> new UnauthorizedException("Usuario nao encontrado"));
    }

    @Transactional
    public UserResponse updateProfile(Long userId, String name) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UnauthorizedException("Usuario nao encontrado"));
        user.setName(name.trim());
        userRepository.save(user);
        return UserResponse.from(user);
    }

    private HouseholdInvite resolveInvite(String rawCode) {
        if (rawCode == null || rawCode.isBlank()) {
            return null;
        }
        String code = rawCode.trim().toUpperCase(Locale.ROOT);
        HouseholdInvite invite = inviteRepository.findByCode(code)
                .orElseThrow(() -> new BusinessRuleException("Codigo de convite invalido"));
        if (!invite.isUsable(Instant.now())) {
            throw new BusinessRuleException("Codigo de convite expirado ou ja utilizado");
        }
        return invite;
    }

    private TokenResponse issueTokens(User user, Household household) {
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = jwtService.generateRefreshToken();

        refreshTokenRepository.save(RefreshToken.builder()
                .user(user)
                .tokenHash(jwtService.hashRefreshToken(refreshToken))
                .expiresAt(jwtService.refreshTokenExpiry())
                .build());

        List<HouseholdMember> members = memberRepository.findByHouseholdIdOrderByIdAsc(household.getId());

        return new TokenResponse(
                accessToken,
                refreshToken,
                jwtService.accessTokenExpiry(),
                UserResponse.from(user),
                HouseholdResponse.of(household, members));
    }
}
