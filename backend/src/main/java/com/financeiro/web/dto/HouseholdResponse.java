package com.financeiro.web.dto;

import com.financeiro.domain.Household;
import com.financeiro.domain.HouseholdMember;
import com.financeiro.domain.enums.MemberRole;

import java.time.Instant;
import java.util.List;

public record HouseholdResponse(
        Long id,
        String name,
        Instant createdAt,
        List<MemberResponse> members
) {
    public static HouseholdResponse of(Household household, List<HouseholdMember> members) {
        return new HouseholdResponse(
                household.getId(),
                household.getName(),
                household.getCreatedAt(),
                members.stream().map(MemberResponse::from).toList());
    }

    public record MemberResponse(
            Long id,
            Long userId,
            String name,
            String email,
            MemberRole role,
            Instant joinedAt
    ) {
        public static MemberResponse from(HouseholdMember member) {
            return new MemberResponse(
                    member.getId(),
                    member.getUser().getId(),
                    member.getUser().getName(),
                    member.getUser().getEmail(),
                    member.getRole(),
                    member.getCreatedAt());
        }
    }
}
