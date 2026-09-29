import { useEffect, useMemo, useState } from 'react';
import { ArrowLeftRight, Plus } from 'lucide-react';
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useCreateTransfer,
  useUpdateTransaction,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/field';
import { ApiError } from '@/lib/api-error';
import { parseNumber, todayIso, TRANSACTION_TYPE_LABELS } from '@/lib/format';
import type { Transaction, TransactionType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
}

type Tab = 'expense' | 'income' | 'transfer';

export function TransactionFormDialog({ open, onClose, transaction }: Props) {
  const toast = useToast();
  const accounts = useAccounts();
  const categories = useCategories();
  const create = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const transfer = useCreateTransfer();

  const [tab, setTab] = useState<Tab>('expense');
  const [form, setForm] = useState({
    accountId: '',
    categoryId: '',
    amount: '',
    description: '',
    notes: '',
    entryDate: todayIso(),
    toAccountId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const type: TransactionType = tab === 'income' ? 'INCOME' : 'EXPENSE';
  const availableCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === (tab === 'income' ? 'INCOME' : 'EXPENSE')),
    [categories.data, tab],
  );

  const isEditing = Boolean(transaction);
  const isTransferEdit = transaction?.type === 'TRANSFER';

  useEffect(() => {
    if (!open) return;
    setErrors({});

    if (transaction) {
      setTab(transaction.type === 'INCOME' ? 'income' : 'expense');
      setForm({
        accountId: String(transaction.accountId),
        categoryId: transaction.categoryId ? String(transaction.categoryId) : '',
        amount: String(transaction.amount),
        description: transaction.description ?? '',
        notes: transaction.notes ?? '',
        entryDate: transaction.entryDate,
        toAccountId: '',
      });
      return;
    }

    setTab('expense');
    setForm({
      accountId: accounts.data?.[0] ? String(accounts.data[0].id) : '',
      categoryId: '',
      amount: '',
      description: '',
      notes: '',
      entryDate: todayIso(),
      toAccountId: '',
    });
  }, [open, transaction, accounts.data]);

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.accountId) next.accountId = 'Selecione a conta';
    if (tab === 'transfer') {
      if (!form.toAccountId) next.toAccountId = 'Selecione a conta de destino';
      else if (form.toAccountId === form.accountId) {
        next.toAccountId = 'A conta de destino deve ser diferente';
      }
    }
    const amount = parseNumber(form.amount);
    if (amount === null) next.amount = 'Informe o valor';
    else if (amount <= 0) next.amount = 'O valor deve ser maior que zero';
    if (!form.entryDate) next.entryDate = 'Informe a data';
    else if (form.entryDate > todayIso()) next.entryDate = 'A data nao pode ser futura';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const amount = parseNumber(form.amount);
    if (amount === null) return;

    try {
      if (isEditing && transaction) {
        await updateMutation.mutateAsync({
          id: transaction.id,
          payload: {
            accountId: Number(form.accountId),
            categoryId: form.categoryId ? Number(form.categoryId) : null,
            type,
            amount,
            description: form.description.trim() || null,
            notes: form.notes.trim() || null,
            entryDate: form.entryDate,
          },
        });
        toast.success('Movimentacao atualizada');
      } else if (tab === 'transfer') {
        await transfer.mutateAsync({
          fromAccountId: Number(form.accountId),
          toAccountId: Number(form.toAccountId),
          amount,
          description: form.description.trim() || null,
          entryDate: form.entryDate,
        });
        toast.success('Transferencia registrada');
      } else {
        await create.mutateAsync({
          accountId: Number(form.accountId),
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          type,
          amount,
          description: form.description.trim() || null,
          notes: form.notes.trim() || null,
          entryDate: form.entryDate,
        });
        toast.success(`${TRANSACTION_TYPE_LABELS[type]} registrada`);
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel salvar a movimentacao');
      }
    }
  };

  const loading = create.isPending || transfer.isPending || updateMutation.isPending;
  const hasAccounts = (accounts.data ?? []).length >= 1;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Editar movimentacao' : 'Nova movimentacao'}
      description={
        isEditing ? undefined : 'Registre receitas, despesas e transferencias entre as contas.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="transaction-form"
            loading={loading}
            disabled={!hasAccounts || isTransferEdit}
            icon={<Plus className="size-4" />}
          >
            {isEditing ? 'Salvar' : 'Registrar'}
          </Button>
        </>
      }
    >
      {!isEditing && (
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
          {(
            [
              ['expense', 'Despesa'],
              ['income', 'Receita'],
              ['transfer', 'Transferencia'],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setErrors({});
                setForm((prev) => ({ ...prev, categoryId: '' }));
              }}
              className={`rounded-md px-2 py-1.5 text-sm font-medium transition ${
                tab === key
                  ? key === 'expense'
                    ? 'bg-expense/15 text-expense'
                    : key === 'income'
                      ? 'bg-income/15 text-income'
                      : 'bg-info/15 text-info'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {key === 'transfer' && <ArrowLeftRight className="mr-1 inline size-3.5" aria-hidden />}
              {label}
            </button>
          ))}
        </div>
      )}

      {isTransferEdit ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-info/40 bg-info/10 p-3 text-sm text-info">
            Transferencias entre contas nao podem ser editadas: elas affectam as duas contas de uma
            vez. Exclua o lancamento e registre a transferencia novamente.
          </p>
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">De</dt>
              <dd className="font-medium">{transaction?.accountName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Valor</dt>
              <dd className="font-medium tabular-nums">{transaction?.amount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Data</dt>
              <dd className="font-medium">{transaction?.entryDate}</dd>
            </div>
          </dl>
        </div>
      ) : !hasAccounts && !accounts.isPending ? (
        <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
          Cadastre uma conta antes de registrar movimentacoes.
        </p>
      ) : (
        <form id="transaction-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={tab === 'transfer' ? 'De qual conta' : 'Conta'}
              required
              value={form.accountId}
              error={errors.accountId}
              onChange={(e) => update('accountId', e.target.value)}
            >
              <option value="">Selecione...</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            {tab === 'transfer' ? (
              <Select
                label="Para qual conta"
                required
                value={form.toAccountId}
                error={errors.toAccountId}
                onChange={(e) => update('toAccountId', e.target.value)}
              >
                <option value="">Selecione...</option>
                {(accounts.data ?? [])
                  .filter((account) => String(account.id) !== form.accountId)
                  .map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
              </Select>
            ) : (
              <Select
                label="Categoria"
                value={form.categoryId}
                error={errors.categoryId}
                onChange={(e) => update('categoryId', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valor"
              required
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              error={errors.amount}
              onChange={(e) => update('amount', e.target.value)}
            />
            <Input
              label="Data"
              type="date"
              required
              max={todayIso()}
              value={form.entryDate}
              error={errors.entryDate}
              onChange={(e) => update('entryDate', e.target.value)}
            />
          </div>

          <Input
            label="Descricao"
            maxLength={255}
            placeholder="Ex.: Supermercado do mes"
            value={form.description}
            error={errors.description}
            onChange={(e) => update('description', e.target.value)}
          />

          <Textarea
            label="Observacoes"
            maxLength={5000}
            rows={2}
            placeholder="Anotacoes opcionais"
            value={form.notes}
            error={errors.notes}
            onChange={(e) => update('notes', e.target.value)}
          />
        </form>
      )}
    </Modal>
  );
}
