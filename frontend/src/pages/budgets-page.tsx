import { useEffect, useMemo, useState } from 'react';
import { Plus, Target, Trash2, Copy, Pencil, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  useBudgets,
  useCategories,
  useCopyBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader, StatCard } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import {
  currentMonth,
  formatCurrency,
  formatMonth,
  formatPercent,
  parseNumber,
  shiftMonth,
} from '@/lib/format';
import type { Budget } from '@/types';

export function BudgetsPage() {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth);
  const budgets = useBudgets(month);
  const categories = useCategories();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();
  const copyBudgets = useCopyBudgets();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);
  const [form, setForm] = useState({ categoryId: '', amountLimit: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const expenseCategories = useMemo(
    () => (categories.data ?? []).filter((category) => category.type === 'EXPENSE'),
    [categories.data],
  );

  const availableCategories = useMemo(() => {
    const used = new Set((budgets.data ?? []).map((budget) => budget.categoryId));
    return expenseCategories.filter(
      (category) => category.active && (!used.has(category.id) || editing?.categoryId === category.id),
    );
  }, [expenseCategories, budgets.data, editing]);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? { categoryId: String(editing.categoryId), amountLimit: String(editing.amountLimit) }
        : { categoryId: availableCategories[0] ? String(availableCategories[0].id) : '', amountLimit: '' },
    );
  }, [open, editing, availableCategories]);

  const totals = useMemo(() => {
    const list = budgets.data ?? [];
    return {
      limit: list.reduce((sum, b) => sum + b.amountLimit, 0),
      spent: list.reduce((sum, b) => sum + b.spent, 0),
      exceeded: list.filter((b) => b.status === 'EXCEEDED').length,
      warning: list.filter((b) => b.status === 'WARNING').length,
    };
  }, [budgets.data]);

  const percentGlobal = totals.limit > 0 ? (totals.spent / totals.limit) * 100 : 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!form.categoryId) next.categoryId = 'Selecione a categoria';
    const amountLimit = parseNumber(form.amountLimit);
    if (amountLimit === null) next.amountLimit = 'Informe o limite';
    else if (amountLimit <= 0) next.amountLimit = 'O limite deve ser maior que zero';

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const payload = {
      categoryId: Number(form.categoryId),
      month,
      amountLimit: amountLimit!,
    };

    try {
      if (editing) {
        await updateBudget.mutateAsync({ id: editing.id, payload });
        toast.success('Orcamento atualizado');
      } else {
        await createBudget.mutateAsync(payload);
        toast.success('Orcamento criado');
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel salvar o orcamento');
      }
    }
  };

  const handleCopy = async () => {
    try {
      const result = await copyBudgets.mutateAsync(month);
      toast.success(
        result.copied > 0
          ? `${result.copied} ${result.copied === 1 ? 'orcamento copiado' : 'orcamentos copiados'} do mes anterior`
          : 'Nada a copiar: todos os orcamentos ja existem ou o mes anterior esta vazio',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel copiar');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteBudget.mutateAsync(deleting.id);
      toast.success('Orcamento removido');
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover');
    }
  };

  const isCurrentMonth = month === currentMonth();

  return (
    <>
      <PageHeader
        title="Orcamentos"
        subtitle={`Metas de gasto por categoria em ${formatMonth(month)}`}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-border bg-surface">
              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, -1))}
                className="btn btn-ghost btn-icon rounded-r-none"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-32 px-1 text-center text-sm font-medium">
                {formatMonth(month)}
              </span>
              <button
                type="button"
                onClick={() => setMonth((prev) => shiftMonth(prev, 1))}
                disabled={isCurrentMonth}
                className="btn btn-ghost btn-icon rounded-l-none disabled:opacity-40"
                aria-label="Proximo mes"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <Button
              variant="secondary"
              icon={<Copy className="size-4" />}
              loading={copyBudgets.isPending}
              onClick={handleCopy}
            >
              Copiar mes anterior
            </Button>
            <Button
              icon={<Plus className="size-4" />}
              disabled={availableCategories.length === 0}
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              Novo orcamento
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Limite total"
          value={formatCurrency(totals.limit)}
          hint={`${(budgets.data ?? []).length} categorias`}
          icon={Target}
        />
        <StatCard
          label="Gasto no mes"
          value={formatCurrency(totals.spent)}
          hint={formatPercent(percentGlobal, 0) + ' do limite'}
          icon={TrendingDown}
          tone={percentGlobal > 100 ? 'expense' : 'default'}
        />
        <StatCard
          label="Disponivel"
          value={formatCurrency(totals.limit - totals.spent)}
          tone={totals.limit - totals.spent < 0 ? 'expense' : 'income'}
          icon={TrendingUp}
        />
        <StatCard
          label="Alertas"
          value={String(totals.exceeded + totals.warning)}
          hint={`${totals.exceeded} estourado · ${totals.warning} proximo do limite`}
          tone={totals.exceeded > 0 ? 'expense' : totals.warning > 0 ? 'warning' : 'default'}
          icon={Target}
        />
      </div>

      {totals.limit > 0 && (
        <Card className="mt-4 p-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">Uso total do orcamento</span>
            <span
              className={`font-semibold tabular-nums ${
                percentGlobal > 100 ? 'text-expense' : 'text-foreground'
              }`}
            >
              {formatCurrency(totals.spent)} / {formatCurrency(totals.limit)}
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-all ${
                percentGlobal > 100 ? 'bg-expense' : percentGlobal > 80 ? 'bg-warning' : 'bg-income'
              }`}
              style={{ width: `${Math.min(percentGlobal, 100)}%` }}
            />
          </div>
        </Card>
      )}

      <Card className="mt-4">
        {budgets.isError ? (
          <ErrorState message={(budgets.error as Error)?.message} onRetry={() => budgets.refetch()} />
        ) : budgets.isPending ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : (budgets.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhum orcamento neste mes"
            description="Defina um limite por categoria e acompanhe o consumo em tempo real."
            icon={<Target className="size-6" />}
            action={
              <Button
                icon={<Plus className="size-4" />}
                disabled={availableCategories.length === 0}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Criar orcamento
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {budgets.data?.map((budget) => {
              const percent = Math.min(budget.percentUsed, 100);
              const over = budget.remaining < 0;

              return (
                <li key={budget.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: budget.categoryColor ?? 'var(--muted-2)' }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{budget.categoryName}</p>
                      <p className="text-xs text-muted-2">
                        {formatCurrency(budget.spent)} de {formatCurrency(budget.amountLimit)}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          over ? 'text-expense' : 'text-foreground'
                        }`}
                      >
                        {over
                          ? `${formatCurrency(Math.abs(budget.remaining))} acima`
                          : `${formatCurrency(budget.remaining)} livres`}
                      </span>
                      <Chip
                        tone={
                          budget.status === 'EXCEEDED'
                            ? 'expense'
                            : budget.status === 'WARNING'
                              ? 'warning'
                              : 'income'
                        }
                      >
                        {formatPercent(budget.percentUsed, 0)}
                      </Chip>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(budget);
                          setOpen(true);
                        }}
                        className="btn btn-ghost btn-icon"
                        aria-label={`Editar ${budget.categoryName}`}
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(budget)}
                        className="btn btn-ghost btn-icon hover:text-expense"
                        aria-label={`Excluir ${budget.categoryName}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        budget.status === 'EXCEEDED'
                          ? 'bg-expense'
                          : budget.status === 'WARNING'
                            ? 'bg-warning'
                            : 'bg-income'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar orcamento' : 'Novo orcamento'}
        description={`Categoria e limite para ${formatMonth(month)}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={createBudget.isPending}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="budget-form"
              loading={createBudget.isPending || updateBudget.isPending}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        <form id="budget-form" onSubmit={submit} className="space-y-4" noValidate>
          <Select
            label="Categoria"
            required
            value={form.categoryId}
            error={errors.categoryId}
            onChange={(e) => setForm((prev) => ({ ...prev, categoryId: e.target.value }))}
          >
            <option value="">Selecione...</option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>

          <Input
            label="Limite mensal"
            required
            inputMode="decimal"
            placeholder="0,00"
            value={form.amountLimit}
            error={errors.amountLimit}
            onChange={(e) => setForm((prev) => ({ ...prev, amountLimit: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remover orcamento"
        message={`O orcamento de "${deleting?.categoryName}" em ${formatMonth(month)} sera removido. As movimentacoes nao sao afetadas.`}
        confirmLabel="Remover"
        loading={deleteBudget.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
