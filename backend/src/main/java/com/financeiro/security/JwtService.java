package com.financeiro.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.io.DecodingException;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessTokenTtl;
    private final Duration refreshTokenTtl;

    public JwtService(com.financeiro.config.JwtProperties props) {
        this.key = resolveKey(props.secret());
        this.accessTokenTtl = Duration.ofMinutes(props.accessTokenMinutes());
        this.refreshTokenTtl = Duration.ofDays(props.refreshTokenDays());
    }

    /**
     * Aceita o segredo em base64 ou em texto puro. Texto puro e sempre
     * derivado por SHA-256 para garantir 256 bits, evitando falha de startup
     * por chave curta demais.
     */
    private static SecretKey resolveKey(String secret) {
        byte[] bytes;
        try {
            bytes = Decoders.BASE64.decode(secret);
        } catch (DecodingException ex) {
            bytes = null;
        }
        if (bytes == null || bytes.length < 32) {
            byte[] raw = secret.getBytes(StandardCharsets.UTF_8);
            try {
                bytes = MessageDigest.getInstance("SHA-256").digest(raw);
            } catch (NoSuchAlgorithmException ex) {
                throw new IllegalStateException("Algoritmo SHA-256 indisponivel", ex);
            }
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    public String generateAccessToken(Long userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(accessTokenTtl)))
                .signWith(key)
                .compact();
    }

    public String generateRefreshToken() {
        return UUID.randomUUID().toString() + "." + UUID.randomUUID();
    }

    public Instant refreshTokenExpiry() {
        return Instant.now().plus(refreshTokenTtl);
    }

    public Instant accessTokenExpiry() {
        return Instant.now().plus(accessTokenTtl);
    }

    public String hashRefreshToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Algoritmo SHA-256 indisponivel", ex);
        }
    }

    /** Retorna o userId, ou null se o token for invalido/expirado. */
    public Long parseUserId(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return Long.valueOf(claims.getSubject());
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Token rejeitado: {}", ex.getMessage());
            return null;
        }
    }
}
