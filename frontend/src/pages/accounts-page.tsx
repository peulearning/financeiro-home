import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Wallet, CreditCard, Banknote, PiggyBank, TrendingUp, Home, RotateCcw } from 'lucide-react';
import {
  useAccounts,
  useCreateAccount,
  useDeactivateAccount,
  useReactivateAccount,
  useUpdateAccount,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import { ACCOUNT_COLORS, ACCOUNT_TYPE_LABELS, formatCurrency, parseNumber } from '@/lib/format';
import type { Account, AccountType } from '@/types';

const TYPE_ICONS = {
  CHECKING: Wallet,
  SAVINGS: PiggyBank,
  CREDIT_CARD: CreditCard,
  CASH: Banknote,
  INVESTMENT: TrendingUp,
} as const;

const emptyForm = {
  name: '',
  type: 'CHECKING' as AccountType,
  openingBalance: '',
  creditLimit: '',
  closingDay: '',
  dueDay: '',
  color: ACCOUNT_COLORS[0],
};

export function AccountsPage() {
  const toast = useToast();
  const accounts = useAccounts(true);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deactivate = useDeactivateAccount();
  const reactivate = useReactivateAccount();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (editing) {
      setForm({
        name: editing.name,
        type: editing.type,
        openingBalance: String(editing.openingBalance ?? 0),
        creditLimit: editing.creditLimit != null ? String(editing.creditLimit) : '',
        closingDay: editing.closingDay != null ? String(editing.closingDay) : '',
        dueDay: editing.dueDay != null ? String(editing.dueDay) : '',
        color: editing.color ?? ACCOUNT_COLORS[0],
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, editing]);

  const isCredit = form.type === 'CREDIT_CARD';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Informe o nome da conta';
    const openingBalance = parseNumber(form.openingBalance);
    if (openingBalance === null) next.openingBalance = 'Informe o saldo inicial';

    let creditLimit: number | null = null;
    if (isCredit) {
      creditLimit = parseNumber(form.creditLimit);
      if (creditLimit === null) next.creditLimit = 'Informe o limite do cartao';
      else if (creditLimit <= 0) next.creditLimit = 'O limite deve ser maior que zero';
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      openingBalance: openingBalance ?? 0,
      creditLimit,
      closingDay: form.closingDay ? Number(form.closingDay) : null,
      dueDay: form.dueDay ? Number(form.dueDay) : null,
      color: form.color,
    };

    try {
      if (editing) {
        await updateAccount.mutateAsync({ id: editing.id, payload });
        toast.success('Conta atualizada');
      } else {
        await createAccount.mutateAsync(payload);
        toast.success('Conta cadastrada');
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel salvar a conta');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deactivate.mutateAsync(deleting.id);
      toast.success(
        deleting.currentBalance === 0
          ? 'Conta removida'
          : 'Conta desativada (historico preservado)',
      );
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover');
    }
  };

  const handleReactivate = async (account: Account) => {
    try {
      await reactivate.mutateAsync(account.id);
      toast.success('Conta reativada');
    } catch {
      toast.error('Nao foi possivel reativar a conta');
    }
  };

  const list = accounts.data ?? [];
  const active = list.filter((account) => account.active);
  const inactive = list.filter((account) => !account.active);

  return (
    <>
      <PageHeader
        title="Contas"
        subtitle="Contas bancarias, cartoes e dinheiro em especie"
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nova conta
          </Button>
        }
      />

      {accounts.isError ? (
        <Card>
          <ErrorState message={(accounts.error as Error)?.message} onRetry={() => accounts.refetch()} />
        </Card>
      ) : accounts.isPending ? (
        <Card>
          <SkeletonTable rows={4} columns={4} />
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhuma conta cadastrada"
            description="Cadastre sua conta corrente, poupanca ou cartao de credito para comecar a controlar as financas."
            icon={<Wallet className="size-6" />}
            action={
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Cadastrar primeira conta
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((account) => {
            const Icon = TYPE_ICONS[account.type];
            const isNegative = account.currentBalance < 0;
            const usedPercent =
              account.creditLimit && Number(account.creditLimit) > 0
                ? Math.min(100, (Math.abs(account.currentBalance) / Number(account.creditLimit)) * 100)
                : null;

            return (
              <Card key={account.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: account.color ?? 'var(--primary)' }}
                    >
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{account.name}</p>
                      <p className="truncate text-xs text-muted-2">
                        {ACCOUNT_TYPE_LABELS[account.type]}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(account);
                        setOpen(true);
                      }}
                      className="btn btn-ghost btn-icon"
                      aria-label={`Editar ${account.name}`}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(account)}
                      className="btn btn-ghost btn-icon hover:text-expense"
                      aria-label={`Remover ${account.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-muted-2">
                    {account.type === 'CREDIT_CARD' ? 'Fatura atual' : 'Saldo atual'}
                  </p>
                  <p
                    className={`text-2xl font-semibold tracking-tight ${
                      isNegative ? 'text-expense' : 'text-foreground'
                    }`}
                  >
                    {formatCurrency(account.currentBalance)}
                  </p>
                </div>

                {account.type === 'CREDIT_CARD' && account.creditLimit != null && (
                  <div className="mt-3">
                    <div className="flex items-baseline justify-between text-xs text-muted">
                      <span>Limite {formatCurrency(Number(account.creditLimit))}</span>
                      <span>Livre {formatCurrency(Number(account.availableCredit ?? 0))}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${
                          usedPercent! > 80 ? 'bg-expense' : usedPercent! > 50 ? 'bg-warning' : 'bg-income'
                        }`}
                        style={{ width: `${usedPercent}%` }}
                      />
                    </div>
                    {account.closingDay && account.dueDay && (
                      <p className="mt-1.5 text-xs text-muted-2">
                        Fecha dia {account.closingDay} · vence dia {account.dueDay}
                      </p>
                    )}
                  </div>
                )}

                {account.type !== 'CREDIT_CARD' && (
                  <p className="mt-3 text-xs text-muted-2">
                    Saldo inicial {formatCurrency(Number(account.openingBalance))}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {inactive.length > 0 && (
        <Card className="mt-5 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <Home className="size-4" aria-hidden />
            Contas inativas ({inactive.length})
          </h2>
          <ul className="space-y-2">
            {inactive.map((account) => (
              <li
                key={account.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="text-xs text-muted-2">
                    {ACCOUNT_TYPE_LABELS[account.type]} · {formatCurrency(account.currentBalance)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Chip tone="muted">Inativa</Chip>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="size-3.5" />}
                    loading={reactivate.isPending}
                    onClick={() => handleReactivate(account)}
                  >
                    Reativar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {active.length > 0 && (
        <p className="mt-4 text-sm text-muted">
          Precisa ver os lançamentos de uma conta?{' '}
          <Link to="/movimentacoes" className="text-primary hover:underline">
            Ir para movimentações
          </Link>
          .
        </p>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar conta' : 'Nova conta'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createAccount.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="account-form"
              loading={createAccount.isPending || updateAccount.isPending}
            >
              {editing ? 'Salvar' : 'Cadastrar'}
            </Button>
          </>
        }
      >
        <form id="account-form" onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label="Nome da conta"
            required
            maxLength={120}
            placeholder="Ex.: Nubank, Bradesco, Visa Gold"
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <Select
            label="Tipo"
            required
            value={form.type}
            error={errors.type}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, type: e.target.value as AccountType }))
            }
          >
            {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Saldo inicial"
              inputMode="decimal"
              placeholder="0,00"
              hint={isCredit ? 'Deixe 0 para cartoes' : undefined}
              value={form.openingBalance}
              error={errors.openingBalance}
              onChange={(e) => setForm((prev) => ({ ...prev, openingBalance: e.target.value }))}
            />
            {isCredit && (
              <Input
                label="Limite total"
                required
                inputMode="decimal"
                placeholder="0,00"
                value={form.creditLimit}
                error={errors.creditLimit}
                onChange={(e) => setForm((prev) => ({ ...prev, creditLimit: e.target.value }))}
              />
            )}
          </div>

          {isCredit && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Dia de fechamento"
                type="number"
                min={1}
                max={31}
                placeholder="Ex.: 20"
                value={form.closingDay}
                error={errors.closingDay}
                onChange={(e) => setForm((prev) => ({ ...prev, closingDay: e.target.value }))}
              />
              <Input
                label="Dia de vencimento"
                type="number"
                min={1}
                max={28}
                placeholder="Ex.: 10"
                value={form.dueDay}
                error={errors.dueDay}
                onChange={(e) => setForm((prev) => ({ ...prev, dueDay: e.target.value }))}
              />
            </div>
          )}

          <div>
            <span className="label">Cor</span>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  className={`size-7 rounded-full transition ${
                    form.color === color
                      ? 'ring-2 ring-foreground ring-offset-2 ring-offset-surface'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${color}`}
                  aria-pressed={form.color === color}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remover conta"
        message={
          deleting && (deleting.currentBalance !== 0 || Number(deleting.openingBalance) !== 0)
            ? `A conta "${deleting.name}" possui movimentacoes e sera apenas desativada, preservando o historico. Deseja continuar?`
            : `A conta "${deleting?.name}" sera removida permanentemente. Deseja continuar?`
        }
        confirmLabel="Remover"
        loading={deactivate.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
