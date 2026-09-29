# Financas do Casal

Sistema de financas pessoais para duas pessoas, com contas, categorias, movimentacoes,
transferencias entre contas, contas a pagar/receber parceladas, recorrencias, orcamentos
mensais e painel consolidado.

- **Backend:** Java 21 + Spring Boot 3.5 (Web, JPA/Hibernate, Security, Validation, Flyway, Actuator)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + TanStack Query + React Router + Recharts
- **Banco:** PostgreSQL 18

## Como o espaco compartilhado funciona

Tudo pertence a um `household`. A primeira pessoa que se cadastra cria o espaco e vira
`OWNER`. Ela gera um codigo de convite em **Configuracoes** e envia para o parceiro, que se
cadastra com esse codigo e entra no mesmo espaco. Todo dado lido ou escrito e filtrado pelo
`household_id` do usuario autenticado: um membro nunca enxerga dados de outro espaco.

## Pre-requisitos

- Java 21+
- Node.js 20+
- PostgreSQL 14+ rodando localmente

## 1. Banco de dados

Crie o banco e um usuario para a aplicacao:

```sql
CREATE ROLE financeiro LOGIN PASSWORD 'uma-senha-forte';
CREATE DATABASE financeiro_casal OWNER financeiro ENCODING 'UTF8';
```

As tabelas sao criadas automaticamente pelo Flyway na primeira execucao
(`V1__baseline.sql` e `V2__transfer_direction.sql`). O Hibernate roda em `ddl-auto: validate`
e nunca altera o schema.

## 2. Backend

```powershell
cd backend
Copy-Item .env.example .env      # ajuste DB_USER, DB_PASSWORD e JWT_SECRET
mvn spring-boot:run
```

Variaveis de ambiente suportadas (todas tem valor padrao para desenvolvimento):

| Variavel | Padrao | Descricao |
| --- | --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5432/financeiro_casal` | Conexao JDBC |
| `DB_USER` / `DB_PASSWORD` | `postgres` | Credenciais do banco |
| `JWT_SECRET` | valor de desenvolvimento | Segredo de assinatura dos tokens |
| `JWT_ACCESS_MINUTES` | `30` | Validade do access token |
| `JWT_REFRESH_DAYS` | `30` | Validade do refresh token |
| `CORS_ORIGINS` | `http://localhost:5173` | Origens liberadas no CORS |
| `SEED_CATEGORIES` | `true` | Cria as categorias padrao ao criar o espaco |
| `RECURRENCE_CRON` | `0 7 3 * * *` | Agenda de geracao das recorrencias |

O `.env` e lido pelo shell/terminal; se preferir, exporte as variaveis antes de rodar.
Endpoints uteis: `GET /actuator/health`.

### Testes

```powershell
mvn test
```

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
```

O Vite faz proxy de `/api` para `http://localhost:8080`. Para apontar direto para outro
backend, defina `VITE_API_URL` (veja `frontend/.env.example`).

```powershell
npm run build    # typecheck + build de producao em dist/
npm run preview  # serve o build localmente
```

## Autenticacao

- Access token JWT (30 min) enviado em `Authorization: Bearer`.
- Refresh token opaco, com hash SHA-256 persistido no banco, rotacionado a cada uso.
- Reuso de refresh token invalido derruba todas as sessoes do usuario.
- O logout revoga o refresh token no servidor antes de limpar o storage local.

## Regras de negocio relevantes

- **Transferencias** gravam duas linhas ligadas por `transferGroupId`, com
  `transferDirection` `OUT` na origem e `IN` no destino. As duas linhas se anulam no
  consolidado e cada conta recebe o sinal correto. Editar ou excluir uma transferencia
  afeta as duas pontas.
- **Parcelas** sao geradas na criacao do compromisso, com a diferenca de centavos
  distribuida nas primeiras parcelas, de modo que a soma e sempre exatamente o total.
  Pagar uma parcela cria a movimentacao; desfazer remove.
- **Cartao de credito:** pagar a fatura e uma entrada (reduz a divida) e comprar no
  cartao e uma saida. O painel usa apenas o saldo negativo como limite usado.
- **Orcamentos** so existem para categorias de despesa e medem o gasto do mes corrente
  da categoria. Ha copia automatica do mes anterior.
- **Recorrencias** geram as ocorrencias pendentes por agendamento diario (03:07) e
  nunca repetem a ultima data ja lancada.
- **Convites** expiram em 7 dias e podem ser usados uma unica vez.
