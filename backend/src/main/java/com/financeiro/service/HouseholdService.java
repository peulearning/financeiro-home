package com.financeiro.service;

import com.financeiro.domain.Household;
import com.financeiro.domain.HouseholdInvite;
import com.financeiro.domain.HouseholdMember;
import com.financeiro.domain.User;
import com.financeiro.domain.enums.MemberRole;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.ConflictException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.HouseholdInviteRepository;
import com.financeiro.repository.HouseholdMemberRepository;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.UserRepository;
import com.financeiro.web.dto.HouseholdResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HouseholdService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final SecureRandom RANDOM = new SecureRandom();

    private final HouseholdRepository householdRepository;
    private final HouseholdMemberRepository memberRepository;
    private final HouseholdInviteRepository inviteRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public HouseholdResponse get(Long householdId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> NotFoundException.of("Espaco compartilhado", householdId));
        List<HouseholdMember> members = memberRepository.findByHouseholdIdOrderByIdAsc(householdId);
        return HouseholdResponse.of(household, members);
    }

    @Transactional
    public HouseholdResponse rename(Long householdId, String name) {
        if (name == null || name.isBlank()) {
            throw new BusinessRuleException("Informe o nome do espaco compartilhado");
        }
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> NotFoundException.of("Espaco compartilhado", householdId));
        household.setName(name.trim());
        householdRepository.save(household);
        return get(householdId);
    }

    @Transactional
    public HouseholdInvite.InviteResponse createInvite(Long householdId, Long userId) {
        Household household = householdRepository.findById(householdId)
                .orElseThrow(() -> NotFoundException.of("Espaco compartilhado", householdId));
        User creator = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("Usuario", userId));

        String code;
        int attempts = 0;
        do {
            code = generateCode();
            attempts++;
        } while (inviteRepository.existsByCode(code) && attempts < 10);

        if (inviteRepository.existsByCode(code)) {
            throw new ConflictException("Nao foi possivel gerar um codigo unico. Tente novamente.");
        }

        HouseholdInvite invite = inviteRepository.save(HouseholdInvite.builder()
                .household(household)
                .code(code)
                .role(MemberRole.MEMBER)
                .createdBy(creator)
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .build());

        return new HouseholdInvite.InviteResponse(
                invite.getId(), invite.getCode(), invite.getExpiresAt(), null, null);
    }

    @Transactional(readOnly = true)
    public List<HouseholdInvite.InviteResponse> listInvites(Long householdId) {
        return inviteRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId).stream()
                .map(i -> new HouseholdInvite.InviteResponse(
                        i.getId(),
                        i.getCode(),
                        i.getExpiresAt(),
                        i.getUsedBy() == null ? null : userName(i.getUsedBy()),
                        i.getUsedAt()))
                .toList();
    }

    @Transactional
    public void revokeInvite(Long householdId, Long inviteId) {
        HouseholdInvite invite = inviteRepository.findById(inviteId)
                .orElseThrow(() -> NotFoundException.of("Convite", inviteId));
        if (!invite.getHousehold().getId().equals(householdId)) {
            throw new NotFoundException("Convite nao encontrado");
        }
        inviteRepository.delete(invite);
    }

    @Transactional
    public HouseholdResponse joinWithCode(Long userId, String rawCode) {
        String code = rawCode == null ? "" : rawCode.trim().toUpperCase();
        if (code.isEmpty()) {
            throw new BusinessRuleException("Informe o codigo de convite");
        }
        HouseholdInvite invite = inviteRepository.findByCode(code)
                .orElseThrow(() -> new BusinessRuleException("Codigo de convite invalido"));
        if (!invite.isUsable(Instant.now())) {
            throw new BusinessRuleException("Codigo de convite expirado ou ja utilizado");
        }
        if (memberRepository.findByUserId(userId).isPresent()) {
            throw new ConflictException("Voce ja pertence a um espaco compartilhado");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> NotFoundException.of("Usuario", userId));

        memberRepository.save(HouseholdMember.builder()
                .household(invite.getHousehold())
                .user(user)
                .role(invite.getRole())
                .build());

        invite.setUsedBy(userId);
        invite.setUsedAt(Instant.now());
        inviteRepository.save(invite);

        return get(invite.getHousehold().getId());
    }

    @Transactional
    public void removeMember(Long householdId, Long userId, Long targetUserId) {
        if (userId.equals(targetUserId)) {
            throw new BusinessRuleException("Voce nao pode se remover do espaco compartilhado");
        }

        HouseholdMember target = memberRepository.findByHouseholdIdAndUserId(householdId, targetUserId)
                .orElseThrow(() -> new NotFoundException("Membro nao encontrado"));

        if (target.getRole() == MemberRole.OWNER) {
            long owners = memberRepository.findByHouseholdIdOrderByIdAsc(householdId).stream()
                    .filter(m -> m.getRole() == MemberRole.OWNER)
                    .count();
            if (owners <= 1) {
                throw new BusinessRuleException("O espaco compartilhado precisa de ao menos um responsavel");
            }
        }

        memberRepository.delete(target);
    }

    private String userName(Long id) {
        return userRepository.findById(id).map(User::getName).orElse("Removido");
    }

    private static String generateCode() {
        StringBuilder builder = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            builder.append(CODE_ALPHABET.charAt(RANDOM.nextInt(CODE_ALPHABET.length())));
        }
        return builder.toString();
    }
}
