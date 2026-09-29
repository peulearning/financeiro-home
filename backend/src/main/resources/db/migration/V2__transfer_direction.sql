-- Sentido das linhas de transferencia: OUT debita a origem, IN credita o destino.
ALTER TABLE transactions ADD COLUMN transfer_direction varchar(3);

-- Movimentacoes antigas de transferencia sao tratadas como saida da conta de origem.
UPDATE transactions SET transfer_direction = 'OUT' WHERE type = 'TRANSFER';

ALTER TABLE transactions
    ADD CONSTRAINT ck_transactions_transfer_direction
    CHECK (
        (type = 'TRANSFER' AND transfer_direction IS NOT NULL)
        OR (type <> 'TRANSFER' AND transfer_direction IS NULL)
    );

CREATE INDEX ix_transactions_transfer_group ON transactions (transfer_group_id)
    WHERE transfer_group_id IS NOT NULL;
