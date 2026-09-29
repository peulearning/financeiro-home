package com.financeiro.domain;

import com.financeiro.domain.enums.TransactionType;
import com.financeiro.domain.enums.TransferDirection;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Movimentacao financeira. Transferencias gravam duas linhas (uma TRANSFER de
 * saida e outra de entrada) ligadas pelo mesmo {@code transferGroupId} e
 * separadas por {@code transferDirection}.
 */
@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "household_id", nullable = false)
    private Household household;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TransactionType type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 255)
    private String description;

    @Column(columnDefinition = "text")
    private String notes;

    @Column(name = "entry_date", nullable = false)
    private LocalDate entryDate;

    @Column(name = "transfer_group_id")
    private UUID transferGroupId;

    @Enumerated(EnumType.STRING)
    @Column(name = "transfer_direction", length = 3)
    private TransferDirection transferDirection;

    @Column(name = "installment_id")
    private Long installmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    /** Sinal do efeito no saldo da conta. */
    public BigDecimal signedAmount() {
        return switch (type) {
            case INCOME -> amount;
            case EXPENSE -> amount.negate();
            case TRANSFER -> transferDirection == TransferDirection.IN ? amount : amount.negate();
        };
    }
}
