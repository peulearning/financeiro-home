-- =====================================================================
--  Baseline do sistema de financas pessoais do casal
--  Todas as tabelas de negocio sao escopadas por household_id.
-- =====================================================================

CREATE TABLE households (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(120) NOT NULL,
    email          VARCHAR(180) NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ux_users_email ON users (LOWER(email));

-- Membros do espaco compartilhado (o casal).
CREATE TABLE household_members (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT       NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role         VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_members_role CHECK (role IN ('OWNER', 'MEMBER')),
    CONSTRAINT ux_members_user UNIQUE (household_id, user_id)
);
CREATE INDEX ix_members_household ON household_members (household_id);

-- Refresh tokens persistidos para permitir logout e revogacao.
CREATE TABLE refresh_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash   VARCHAR(128) NOT NULL,
    expires_at   TIMESTAMPTZ  NOT NULL,
    revoked_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX ux_refresh_token_hash ON refresh_tokens (token_hash);
CREATE INDEX ix_refresh_user ON refresh_tokens (user_id);

-- Codigos de convite para o segundo adulto entrar no espaco compartilhado.
CREATE TABLE household_invites (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT       NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    code         VARCHAR(12)  NOT NULL,
    role         VARCHAR(20)  NOT NULL DEFAULT 'MEMBER',
    created_by   BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    used_by      BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    used_at      TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_invites_role CHECK (role IN ('OWNER', 'MEMBER'))
);
CREATE UNIQUE INDEX ux_invites_code ON household_invites (code);
CREATE INDEX ix_invites_household ON household_invites (household_id);

-- Contas: correntes, poupancas, cartoes de credito, dinheiro, investimentos.
CREATE TABLE accounts (
    id              BIGSERIAL PRIMARY KEY,
    household_id    BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    name            VARCHAR(120)  NOT NULL,
    type            VARCHAR(30)   NOT NULL,
    opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit_limit    NUMERIC(15, 2),
    closing_day     INTEGER,
    due_day         INTEGER,
    color           VARCHAR(20),
    active          BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_accounts_type CHECK (type IN ('CHECKING', 'SAVINGS', 'CREDIT_CARD', 'CASH', 'INVESTMENT')),
    CONSTRAINT ck_accounts_closing_day CHECK (closing_day IS NULL OR closing_day BETWEEN 1 AND 31),
    CONSTRAINT ck_accounts_due_day CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 28),
    CONSTRAINT ux_accounts_name UNIQUE (household_id, name)
);
CREATE INDEX ix_accounts_household ON accounts (household_id, active);

CREATE TABLE categories (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT       NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    name         VARCHAR(120) NOT NULL,
    type         VARCHAR(10)  NOT NULL,
    color        VARCHAR(20),
    icon         VARCHAR(60),
    active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_categories_type CHECK (type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT ux_categories_name UNIQUE (household_id, name, type)
);
CREATE INDEX ix_categories_household ON categories (household_id, active);

-- Movimentacoes. TRANSFER usa transfer_group_id para ligar origem e destino.
CREATE TABLE transactions (
    id                BIGSERIAL PRIMARY KEY,
    household_id      BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    account_id        BIGINT        NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
    category_id       BIGINT        REFERENCES categories (id) ON DELETE SET NULL,
    type              VARCHAR(10)   NOT NULL,
    amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description       VARCHAR(255),
    notes             TEXT,
    entry_date        DATE          NOT NULL,
    transfer_group_id UUID,
    installment_id    BIGINT,
    created_by        BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_transactions_type CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER'))
);
CREATE INDEX ix_tx_household_date ON transactions (household_id, entry_date DESC);
CREATE INDEX ix_tx_account ON transactions (account_id, entry_date DESC);
CREATE INDEX ix_tx_category ON transactions (category_id);
CREATE INDEX ix_tx_transfer_group ON transactions (transfer_group_id);
CREATE INDEX ix_tx_created_by ON transactions (created_by);

-- Compromissos parcelados: contas a pagar e a receber.
CREATE TABLE bills (
    id                BIGSERIAL PRIMARY KEY,
    household_id      BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    account_id        BIGINT        NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
    category_id       BIGINT        REFERENCES categories (id) ON DELETE SET NULL,
    type              VARCHAR(10)   NOT NULL,
    description       VARCHAR(180)  NOT NULL,
    total_amount      NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
    installment_count INTEGER       NOT NULL CHECK (installment_count > 0),
    first_due_date    DATE          NOT NULL,
    created_by        BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    notes             TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_bills_type CHECK (type IN ('PAYABLE', 'RECEIVABLE'))
);
CREATE INDEX ix_bills_household ON bills (household_id, type);

CREATE TABLE bill_installments (
    id             BIGSERIAL PRIMARY KEY,
    bill_id        BIGINT        NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
    household_id   BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    number         INTEGER       NOT NULL CHECK (number > 0),
    amount         NUMERIC(15, 2) NOT NULL CHECK (amount >= 0),
    due_date       DATE          NOT NULL,
    paid_at        TIMESTAMPTZ,
    transaction_id BIGINT        REFERENCES transactions (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_installment_bill_number UNIQUE (bill_id, number)
);
CREATE INDEX ix_installments_household_due ON bill_installments (household_id, due_date);
CREATE INDEX ix_installments_unpaid ON bill_installments (household_id, paid_at) WHERE paid_at IS NULL;

ALTER TABLE transactions
    ADD CONSTRAINT fk_transactions_installment
    FOREIGN KEY (installment_id) REFERENCES bill_installments (id) ON DELETE SET NULL;

-- Lancamentos recorrentes (aluguel, assinaturas, salario).
CREATE TABLE recurrences (
    id                BIGSERIAL PRIMARY KEY,
    household_id      BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    account_id        BIGINT        NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    category_id       BIGINT        REFERENCES categories (id) ON DELETE SET NULL,
    type              VARCHAR(10)   NOT NULL,
    amount            NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description       VARCHAR(180)  NOT NULL,
    frequency         VARCHAR(20)   NOT NULL,
    start_date        DATE          NOT NULL,
    end_date          DATE,
    day_of_month      INTEGER,
    weekday           INTEGER,
    active            BOOLEAN       NOT NULL DEFAULT TRUE,
    last_generated_at DATE,
    created_by        BIGINT        NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_recurrences_type CHECK (type IN ('INCOME', 'EXPENSE')),
    CONSTRAINT ck_recurrences_frequency CHECK (frequency IN ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY')),
    CONSTRAINT ck_recurrences_day_of_month CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31),
    CONSTRAINT ck_recurrences_weekday CHECK (weekday IS NULL OR weekday BETWEEN 1 AND 7)
);
CREATE INDEX ix_recurrences_household ON recurrences (household_id, active);

-- Metas de orcamento por categoria e por mes de referencia.
CREATE TABLE budgets (
    id           BIGSERIAL PRIMARY KEY,
    household_id BIGINT        NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    category_id  BIGINT        NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
    month        DATE          NOT NULL,
    amount_limit NUMERIC(15, 2) NOT NULL CHECK (amount_limit > 0),
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT ux_budgets_category_month UNIQUE (household_id, category_id, month)
);
CREATE INDEX ix_budgets_household_month ON budgets (household_id, month);
