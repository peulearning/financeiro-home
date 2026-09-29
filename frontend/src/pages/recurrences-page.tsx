import { useEffect, useMemo, useState } from 'react';
import { Plus, Repeat, Trash2, Pencil, Play, Pause, Sparkles } from 'lucide-react';
import {
  useAccounts,
  useCategories,
  useCreateRecurrence,
  useDeleteRecurrence,
  useGenerateRecurrences,
  useRecurrences,
  useToggleRecurrence,
  useUpdateRecurrence,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import { formatCurrency, FREQUENCY_LABELS, parseNumber, todayIso, WEEKDAY_LABELS } from '@/lib/format';
import type { Recurrence, RecurrenceFrequency, TransactionType } from '@/types';

const emptyForm = {
  accountId: '',
  categoryId: '',
  type: 'EXPENSE' as TransactionType,
  amount: '',
  description: '',
  frequency: 'MONTHLY' as RecurrenceFrequency,
  startDate: todayIso(),
  endDate: '',
  dayOfMonth: '',
  weekday: '',
};

export function RecurrencesPage() {
  const toast = useToast();
  const recurrences = useRecurrences();
  const accounts = useAccounts();
  const categories = useCategories();
  const createRecurrence = useCreateRecurrence();
  const updateRecurrence = useUpdateRecurrence();
  const toggleRecurrence = useToggleRecurrence();
  const deleteRecurrence = useDeleteRecurrence();
  const generate = useGenerateRecurrences();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Recurrence | null>(null);
  const [deleting, setDeleting] = useState<Recurrence | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            accountId: String(editing.accountId),
            categoryId: editing.categoryId ? String(editing.categoryId) : '',
            type: editing.type,
            amount: String(editing.amount),
            description: editing.description,
            frequency: editing.frequency,
            startDate: editing.startDate,
            endDate: editing.endDate ?? '',
            dayOfMonth: editing.dayOfMonth ? String(editing.dayOfMonth) : '',
            weekday: editing.weekday ? String(editing.weekday) : '',
          }
        : {
            ...emptyForm,
            accountId: accounts.data?.[0] ? String(accounts.data[0].id) : '',
          },
    );
  }, [open, editing, accounts.data]);

  const availableCategories = useMemo(
    () =>
      (categories.data ?? []).filter((c) => c.type === (form.type === 'INCOME' ? 'INCOME' : 'EXPENSE')),
    [categories.data, form.type],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    const next: Record<string, string> = {};
    if (!form.accountId) next.accountId = 'Selecione a conta';
    if (!form.description.trim()) next.description = 'Informe a descricao';

    const amount = parseNumber(form.amount);
    if (amount === null) next.amount = 'Informe o valor';
    else if (amount <= 0) next.amount = 'O valor deve ser maior que zero';

    if (!form.startDate) next.startDate = 'Informe a data de inicio';
    if (form.endDate && form.startDate && form.endDate < form.startDate) {
      next.endDate = 'A data final deve ser posterior a inicial';
    }
    if (form.frequency === 'WEEKLY' && !form.weekday) {
      next.weekday = 'Selecione o dia da semana';
    }

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }

    const payload = {
      accountId: Number(form.accountId),
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      type: form.type,
      amount: amount!,
      description: form.description.trim(),
      frequency: form.frequency,
      startDate: form.startDate,
      endDate: form.endDate || null,
      dayOfMonth:
        form.frequency === 'MONTHLY' ? Number(form.dayOfMonth || form.startDate.slice(8, 10)) : null,
      weekday: form.frequency === 'WEEKLY' ? Number(form.weekday) : null,
    };

    try {
      if (editing) {
        await updateRecurrence.mutateAsync({ id: editing.id, payload });
        toast.success('Recorrencia atualizada');
      } else {
        await createRecurrence.mutateAsync(payload);
        toast.success('Recorrencia criada');
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel salvar a recorrencia');
      }
    }
  };

  const handleGenerate = async (recurrence: Recurrence) => {
    try {
      const result = await generate.mutateAsync(recurrence.id);
      toast.success(
        result.created > 0
          ? `${result.created} ${result.created === 1 ? 'movimentacao gerada' : 'movimentacoes geradas'}`
          : 'Nenhuma movimentacao pendente',
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Falha ao gerar');
    }
  };

  const handleToggle = async (recurrence: Recurrence) => {
    try {
      await toggleRecurrence.mutateAsync({ id: recurrence.id, active: !recurrence.active });
      toast.success(recurrence.active ? 'Recorrencia pausada' : 'Recorrencia reativada');
    } catch {
      toast.error('Nao foi possivel alterar a recorrencia');
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteRecurrence.mutateAsync(deleting.id);
      toast.success('Recorrencia excluida');
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel excluir');
    }
  };

  const describe = (recurrence: Recurrence): string => {
    switch (recurrence.frequency) {
      case 'DAILY':
        return 'Todo dia';
      case 'WEEKLY':
        return `Toda ${WEEKDAY_LABELS[recurrence.weekday ?? 1].toLowerCase()}`;
      case 'MONTHLY':
        return recurrence.dayOfMonth
          ? `Todo dia ${recurrence.dayOfMonth} de cada mes`
          : 'Mensal';
      case 'YEARLY':
        return 'Uma vez por ano';
    }
  };

  return (
    <>
      <PageHeader
        title="Recorrencias"
        subtitle="Lancamentos automaticos como aluguel, assinaturas e salario"
        actions={
          <Button
            icon={<Plus className="size-4" />}
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            Nova recorrencia
          </Button>
        }
      />

      <Card className="mb-4 flex items-start gap-3 border-info/30 bg-info/5 p-4">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p className="text-sm text-muted">
          As recorrencias geram as movimentacoes automaticamente todo dia as 03:07. Voce tambem pode
          gerar manualmente pelo botao <strong className="text-foreground">Gerar agora</strong>.
        </p>
      </Card>

      <Card>
        {recurrences.isError ? (
          <ErrorState
            message={(recurrences.error as Error)?.message}
            onRetry={() => recurrences.refetch()}
          />
        ) : recurrences.isPending ? (
          <SkeletonTable rows={5} columns={4} />
        ) : (recurrences.data ?? []).length === 0 ? (
          <EmptyState
            title="Nenhuma recorrencia cadastrada"
            description="Cadastre salary, aluguel e assinaturas para nao precisar lancar todo mes."
            icon={<Repeat className="size-6" />}
            action={
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Nova recorrencia
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-border">
            {recurrences.data?.map((recurrence) => (
              <li key={recurrence.id} className="flex flex-wrap items-center gap-3 p-4">
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                    recurrence.type === 'INCOME' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
                  }`}
                >
                  <Repeat className="size-4" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{recurrence.description}</p>
                    {!recurrence.active && <Chip tone="muted">Pausada</Chip>}
                  </div>
                  <p className="truncate text-xs text-muted-2">
                    {describe(recurrence)} · {recurrence.accountName}
                    {recurrence.categoryName ? ` · ${recurrence.categoryName}` : ''}
                    {recurrence.endDate ? ` · ate ${recurrence.endDate}` : ''}
                  </p>
                  {recurrence.lastGeneratedAt && (
                    <p className="text-xs text-muted-2">
                      Ultima geracao: {recurrence.lastGeneratedAt}
                    </p>
                  )}
                </div>

                <span
                  className={`shrink-0 font-semibold tabular-nums ${
                    recurrence.type === 'INCOME' ? 'text-income' : 'text-expense'
                  }`}
                >
                  {recurrence.type === 'INCOME' ? '+' : '-'} {formatCurrency(recurrence.amount)}
                </span>

                <div className="flex shrink-0 gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleGenerate(recurrence)}
                    disabled={!recurrence.active || generate.isPending}
                    className="btn btn-ghost btn-icon"
                    aria-label="Gerar agora"
                    title="Gerar agora"
                  >
                    <Play className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggle(recurrence)}
                    className="btn btn-ghost btn-icon"
                    aria-label={recurrence.active ? 'Pausar' : 'Reativar'}
                    title={recurrence.active ? 'Pausar' : 'Reativar'}
                  >
                    {recurrence.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(recurrence);
                      setOpen(true);
                    }}
                    className="btn btn-ghost btn-icon"
                    aria-label="Editar"
                    title="Editar"
                  >
                    <Pencil className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(recurrence)}
                    className="btn btn-ghost btn-icon hover:text-expense"
                    aria-label="Excluir"
                    title="Excluir"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar recorrencia' : 'Nova recorrencia'}
        size="lg"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={createRecurrence.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="recurrence-form"
              loading={createRecurrence.isPending || updateRecurrence.isPending}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        <form id="recurrence-form" onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo"
              required
              value={form.type}
              error={errors.type}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  type: e.target.value as TransactionType,
                  categoryId: '',
                }))
              }
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Receita</option>
            </Select>

            <Select
              label="Frequencia"
              required
              value={form.frequency}
              error={errors.frequency}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, frequency: e.target.value as RecurrenceFrequency }))
              }
            >
              {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label="Descricao"
            required
            maxLength={180}
            placeholder="Ex.: Aluguel, Netflix, Salario"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Valor"
              required
              inputMode="decimal"
              placeholder="0,00"
              value={form.amount}
              error={errors.amount}
              onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
            />
            <Input
              label="Inicia em"
              required
              type="date"
              value={form.startDate}
              error={errors.startDate}
              onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>

          {form.frequency === 'MONTHLY' && (
            <Input
              label="Dia do mes"
              type="number"
              min={1}
              max={31}
              placeholder={form.startDate.slice(8, 10)}
              hint="Se vazio, usa o dia da data de inicio. Em meses menores, ajusta para o ultimo dia."
              value={form.dayOfMonth}
              error={errors.dayOfMonth}
              onChange={(e) => setForm((prev) => ({ ...prev, dayOfMonth: e.target.value }))}
            />
          )}

          {form.frequency === 'WEEKLY' && (
            <Select
              label="Dia da semana"
              required
              value={form.weekday}
              error={errors.weekday}
              onChange={(e) => setForm((prev) => ({ ...prev, weekday: e.target.value }))}
            >
              <option value="">Selecione...</option>
              {WEEKDAY_LABELS.slice(1).map((label, index) => (
                <option key={label} value={index + 1}>
                  {label}
                </option>
              ))}
            </Select>
          )}

          <Input
            label="Ate (opcional)"
            type="date"
            hint="Deixe vazio para nunca encerrar"
            value={form.endDate}
            error={errors.endDate}
            onChange={(e) => setForm((prev) => ({ ...prev, endDate: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir recorrencia"
        message={`"${deleting?.description}" deixara de gerar movimentacoes. As movimentacoes ja geradas permanecem. Deseja continuar?`}
        confirmLabel="Excluir"
        loading={deleteRecurrence.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
