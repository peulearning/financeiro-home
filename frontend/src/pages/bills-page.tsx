import { useEffect, useMemo, useState } from 'react';
import { Plus, ReceiptText, Trash2, Check, RotateCcw, ChevronDown, AlertTriangle } from 'lucide-react';
import { useAccounts, useBills, useCategories, useCreateBill, useDeleteBill, useToggleInstallment } from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader, StatCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import { formatCurrency, formatDateShort, parseNumber, todayIso } from '@/lib/format';
import type { Bill, BillType } from '@/types';

const emptyForm = {
  accountId: '',
  categoryId: '',
  type: 'PAYABLE' as BillType,
  description: '',
  totalAmount: '',
  installmentCount: '1',
  firstDueDate: todayIso(),
  notes: '',
};

export function BillsPage() {
  const toast = useToast();
  const bills = useBills();
  const accounts = useAccounts();
  const categories = useCategories();
  const createBill = useCreateBill();
  const deleteBill = useDeleteBill();
  const toggleInstallment = useToggleInstallment();

  const [tab, setTab] = useState<'PAYABLE' | 'RECEIVABLE'>('PAYABLE');
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Bill | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm((prev) => ({
      ...emptyForm,
      type: tab,
      accountId: prev.accountId || (accounts.data?.[0] ? String(accounts.data[0].id) : ''),
    }));
  }, [open, tab, accounts.data]);

  const availableCategories = useMemo(
    () => (categories.data ?? []).filter((c) => c.type === (tab === 'PAYABLE' ? 'EXPENSE' : 'INCOME')),
    [categories.data, tab],
  );

  const grouped = useMemo(() => {
    const list = bills.data ?? [];
    const filtered = list.filter((bill) => bill.type === tab);
    return {
      overdue: filtered.filter((bill) =>
        (bill.installments ?? []).some((i) => !i.paid && new Date(i.dueDate) < new Date()),
      ),
      open: filtered.filter(
        (bill) =>
          (bill.installments ?? []).some((i) => !i.paid) &&
          !(bill.installments ?? []).some((i) => !i.paid && new Date(i.dueDate) < new Date()),
      ),
      settled: filtered.filter(
        (bill) => (bill.installments ?? []).every((i) => i.paid),
      ),
    };
  }, [bills.data, tab]);

  const stats = useMemo(() => {
    const list = bills.data ?? [];
    const today = new Date();
    const openInstallments = list.flatMap((bill) =>
      (bill.installments ?? [])
        .filter((i) => !i.paid)
        .map((i) => ({ ...i, bill })),
    );
    return {
      openCount: openInstallments.length,
      openAmount: openInstallments.reduce((sum, i) => sum + i.amount, 0),
      overdueCount: openInstallments.filter((i) => new Date(i.dueDate) < today).length,
      overdueAmount: openInstallments
        .filter((i) => new Date(i.dueDate) < today)
        .reduce((sum, i) => sum + i.amount, 0),
      monthAmount: openInstallments
        .filter((i) => {
          const date = new Date(i.dueDate);
          return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
        })
        .reduce((sum, i) => sum + i.amount, 0),
    };
  }, [bills.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!form.accountId) next.accountId = 'Selecione a conta';
    if (!form.description.trim()) next.description = 'Informe a descricao';

    const totalAmount = parseNumber(form.totalAmount);
    if (totalAmount === null) next.totalAmount = 'Informe o valor total';
    else if (totalAmount <= 0) next.totalAmount = 'O valor deve ser maior que zero';

    const count = Number(form.installmentCount);
    if (!Number.isInteger(count) || count < 1) next.installmentCount = 'Informe ao menos 1 parcela';
    else if (count > 480) next.installmentCount = 'Maximo de 480 parcelas';

    if (!form.firstDueDate) next.firstDueDate = 'Informe o primeiro vencimento';

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    try {
      await createBill.mutateAsync({
        accountId: Number(form.accountId),
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        type: form.type,
        description: form.description.trim(),
        totalAmount: totalAmount!,
        installmentCount: count,
        firstDueDate: form.firstDueDate,
        notes: form.notes.trim() || null,
      });
      toast.success('Compromisso criado com as parcelas geradas');
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel criar o compromisso');
      }
    }
  };

  const handleToggle = async (installmentId: number, paid: boolean) => {
    try {
      await toggleInstallment.mutateAsync({ installmentId });
      toast.success(paid ? 'Pagamento desfeito' : 'Parcela paga');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel atualizar');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBill.mutateAsync(deleting.id);
      toast.success('Compromisso excluido');
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel excluir');
    }
  };

  const toggleExpanded = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderBill = (bill: Bill) => {
    const installments = bill.installments ?? [];
    const isOpen = expanded.has(bill.id);
    const progress =
      bill.installmentCount > 0 ? (bill.paidInstallments / bill.installmentCount) * 100 : 0;
    const hasOverdue = installments.some((i) => !i.paid && new Date(i.dueDate) < new Date());

    return (
      <li key={bill.id} className="rounded-xl border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-3 p-3.5">
          <button
            type="button"
            onClick={() => toggleExpanded(bill.id)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={isOpen}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                bill.type === 'PAYABLE' ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income'
              }`}
            >
              <ReceiptText className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{bill.description}</p>
              <p className="truncate text-xs text-muted-2">
                {bill.installmentCount}x de {formatCurrency(bill.totalAmount / bill.installmentCount)}
                {' · '}
                {bill.accountName}
                {bill.categoryName ? ` · ${bill.categoryName}` : ''}
              </p>
            </div>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-2 transition ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>

          <div className="flex shrink-0 items-center gap-2">
            {hasOverdue && (
              <Chip tone="expense">
                <AlertTriangle className="size-3" aria-hidden /> Atraso
              </Chip>
            )}
            <div className="text-right">
              <p className="font-semibold tabular-nums">
                {formatCurrency(bill.remainingAmount)}
              </p>
              <p className="text-xs text-muted-2">
                {bill.paidInstallments}/{bill.installmentCount} pagas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDeleting(bill)}
              className="btn btn-ghost btn-icon hover:text-expense"
              aria-label={`Excluir ${bill.description}`}
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="px-3.5 pb-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-all ${hasOverdue ? 'bg-expense' : 'bg-income'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {isOpen && (
          <div className="border-t border-border bg-surface-2/50">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Vencimento</th>
                  <th className="text-right">Valor</th>
                  <th className="w-24 text-right">Acao</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((installment) => {
                  const overdue = !installment.paid && new Date(installment.dueDate) < new Date();
                  return (
                    <tr key={installment.id}>
                      <td className="font-medium tabular-nums">{installment.number}</td>
                      <td className={overdue ? 'font-medium text-expense' : 'text-muted'}>
                        {formatDateShort(installment.dueDate)}
                        {overdue && <span className="ml-1.5 text-xs">(atrasada)</span>}
                      </td>
                      <td className="text-right font-medium tabular-nums">
                        {formatCurrency(installment.amount)}
                      </td>
                      <td className="text-right">
                        {installment.paid ? (
                          <div className="flex items-center justify-end gap-2">
                            <Chip tone="income">
                              <Check className="size-3" aria-hidden /> Paga
                            </Chip>
                            <button
                              type="button"
                              onClick={() => handleToggle(installment.id, true)}
                              className="btn btn-ghost btn-icon"
                              aria-label="Desfazer pagamento"
                              title="Desfazer pagamento"
                            >
                              <RotateCcw className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Check className="size-3.5" />}
                            loading={toggleInstallment.isPending}
                            onClick={() => handleToggle(installment.id, false)}
                          >
                            Pagar
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </li>
    );
  };

  const list = [...grouped.overdue, ...grouped.open, ...grouped.settled];

  return (
    <>
      <PageHeader
        title="Compromissos"
        subtitle="Contas a pagar e a receber, parceladas"
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => setOpen(true)}
          >
            Novo compromisso
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Em aberto"
          value={formatCurrency(stats.openAmount)}
          hint={`${stats.openCount} ${stats.openCount === 1 ? 'parcela' : 'parcelas'}`}
          icon={ReceiptText}
        />
        <StatCard
          label="Vence este mes"
          value={formatCurrency(stats.monthAmount)}
          icon={ReceiptText}
        />
        <StatCard
          label="Em atraso"
          value={formatCurrency(stats.overdueAmount)}
          hint={`${stats.overdueCount} ${stats.overdueCount === 1 ? 'parcela' : 'parcelas'}`}
          icon={AlertTriangle}
          tone={stats.overdueCount > 0 ? 'expense' : 'default'}
        />
        <StatCard
          label="Quitado"
          value={String(grouped.settled.length)}
          hint="compromissos 100% pagos"
          icon={Check}
          tone="income"
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1 sm:w-80">
        {(
          [
            ['PAYABLE', 'A pagar'],
            ['RECEIVABLE', 'A receber'],
          ] as [BillType, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === value
                ? value === 'PAYABLE'
                  ? 'bg-expense/15 text-expense'
                  : 'bg-income/15 text-income'
                : 'text-muted hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="mt-4">
        {bills.isError ? (
          <ErrorState message={(bills.error as Error)?.message} onRetry={() => bills.refetch()} />
        ) : bills.isPending ? (
          <SkeletonTable rows={5} columns={4} />
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === 'PAYABLE' ? 'Nenhuma conta a pagar' : 'Nenhum valor a receber'}
            description="Cadastre um compromisso e o sistema gera todas as parcelas automaticamente."
            icon={<ReceiptText className="size-6" />}
            action={
              <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
                Novo compromisso
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5 p-4">{list.map(renderBill)}</ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Novo compromisso"
        description="Informe o total e o sistema reparte em parcelas, ajustando a ultima para fechar a conta."
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createBill.isPending}>
              Cancelar
            </Button>
            <Button type="submit" form="bill-form" loading={createBill.isPending}>
              Criar parcelas
            </Button>
          </>
        }
      >
        <form id="bill-form" onSubmit={submit} className="space-y-4" noValidate>
          <Select
            label="Tipo"
            required
            value={form.type}
            error={errors.type}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, type: e.target.value as BillType, categoryId: '' }))
            }
          >
            <option value="PAYABLE">A pagar</option>
            <option value="RECEIVABLE">A receber</option>
          </Select>

          <Input
            label="Descricao"
            required
            maxLength={180}
            placeholder="Ex.: Financiamento do carro"
            value={form.description}
            error={errors.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Conta"
              required
              value={form.accountId}
              error={errors.accountId}
              onChange={(e) => setForm((prev) => ({ ...prev, accountId: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>

            <Select
              label="Categoria"
              value={form.categoryId}
              error={errors.categoryId}
              onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
            >
              <option value="">Sem categoria</option>
              {availableCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Valor total"
              required
              inputMode="decimal"
              placeholder="0,00"
              value={form.totalAmount}
              error={errors.totalAmount}
              onChange={(e) => setForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
            />
            <Input
              label="Parcelas"
              required
              type="number"
              min={1}
              max={480}
              value={form.installmentCount}
              error={errors.installmentCount}
              onChange={(e) => setForm((prev) => ({ ...prev, installmentCount: e.target.value }))}
            />
            <Input
              label="1o vencimento"
              required
              type="date"
              value={form.firstDueDate}
              error={errors.firstDueDate}
              onChange={(e) => setForm((prev) => ({ ...prev, firstDueDate: e.target.value }))}
            />
          </div>

          {form.totalAmount && Number(form.installmentCount) > 0 && (
            <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted">
              Parcelas de{' '}
              <strong className="text-foreground">
                {formatCurrency(
                  (parseNumber(form.totalAmount) ?? 0) / Math.max(1, Number(form.installmentCount)),
                )}
              </strong>
            </p>
          )}

          <Textarea
            label="Observacoes"
            rows={2}
            maxLength={5000}
            value={form.notes}
            error={errors.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir compromisso"
        message={
          deleting && deleting.paidInstallments > 0
            ? `"${deleting.description}" possui ${deleting.paidInstallments} parcela(s) paga(s). Todas as parcelas e movimentacoes serao removidas. Deseja continuar?`
            : `"${deleting?.description}" e todas as suas parcelas serao removidas. Deseja continuar?`
        }
        confirmLabel="Excluir"
        loading={deleteBill.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
