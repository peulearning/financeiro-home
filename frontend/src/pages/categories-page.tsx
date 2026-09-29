import { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Tags, RotateCcw, TrendingUp, TrendingDown } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useDeactivateCategory,
  useReactivateCategory,
  useUpdateCategory,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, Chip, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import { ACCOUNT_COLORS, CATEGORY_TYPE_LABELS } from '@/lib/format';
import type { Category, CategoryType } from '@/types';

const emptyForm = {
  name: '',
  type: 'EXPENSE' as CategoryType,
  color: ACCOUNT_COLORS[0],
  icon: '',
};

export function CategoriesPage() {
  const toast = useToast();
  const categories = useCategories(true);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deactivate = useDeactivateCategory();
  const reactivate = useReactivateCategory();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setForm(
      editing
        ? {
            name: editing.name,
            type: editing.type,
            color: editing.color ?? ACCOUNT_COLORS[0],
            icon: editing.icon ?? '',
          }
        : emptyForm,
    );
  }, [open, editing]);

  const grouped = useMemo(() => {
    const list = categories.data ?? [];
    return {
      expense: list.filter((category) => category.type === 'EXPENSE'),
      income: list.filter((category) => category.type === 'INCOME'),
    };
  }, [categories.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});

    if (!form.name.trim()) {
      setErrors({ name: 'Informe o nome da categoria' });
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      color: form.color,
      icon: form.icon.trim() || null,
    };

    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, payload });
        toast.success('Categoria atualizada');
      } else {
        await createCategory.mutateAsync(payload);
        toast.success('Categoria criada');
      }
      setOpen(false);
      setEditing(null);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) toast.error(error.message);
      } else {
        toast.error('Nao foi possivel salvar a categoria');
      }
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deactivate.mutateAsync(deleting.id);
      toast.success('Categoria desativada');
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel desativar');
    }
  };

  const handleReactivate = async (category: Category) => {
    try {
      await reactivate.mutateAsync(category.id);
      toast.success('Categoria reativada');
    } catch {
      toast.error('Nao foi possivel reativar');
    }
  };

  const renderList = (items: Category[], icon: typeof TrendingDown) => {
    if (items.length === 0) {
      return (
        <p className="rounded-lg bg-surface-2 px-4 py-6 text-center text-sm text-muted">
          Nenhuma {icon === TrendingUp ? 'receita' : 'despesa'} cadastrada
        </p>
      );
    }

    return (
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((category) => (
          <li
            key={category.id}
            className={`flex items-center gap-3 rounded-xl border border-border p-3 ${
              category.active ? '' : 'opacity-55'
            }`}
          >
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: category.color ?? 'var(--muted-2)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{category.name}</p>
              {category.icon && <p className="truncate text-xs text-muted-2">{category.icon}</p>}
            </div>

            {category.active ? (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(category);
                    setOpen(true);
                  }}
                  className="btn btn-ghost btn-icon"
                  aria-label={`Editar ${category.name}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(category)}
                  className="btn btn-ghost btn-icon hover:text-expense"
                  aria-label={`Desativar ${category.name}`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <Chip tone="muted">Inativa</Chip>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<RotateCcw className="size-3.5" />}
                  loading={reactivate.isPending}
                  onClick={() => handleReactivate(category)}
                >
                  Reativar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const total =
    grouped.expense.filter((c) => c.active).length + grouped.income.filter((c) => c.active).length;

  return (
    <>
      <PageHeader
        title="Categorias"
        subtitle={`${total} ${total === 1 ? 'categoria ativa' : 'categorias ativas'}`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setForm({ ...emptyForm, type: 'EXPENSE' });
                setOpen(true);
              }}
            >
              Nova despesa
            </Button>
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setForm({ ...emptyForm, type: 'INCOME', color: ACCOUNT_COLORS[3] });
                setOpen(true);
              }}
            >
              Nova receita
            </Button>
          </>
        }
      />

      {categories.isError ? (
        <Card>
          <ErrorState
            message={(categories.error as Error)?.message}
            onRetry={() => categories.refetch()}
          />
        </Card>
      ) : categories.isPending ? (
        <Card>
          <SkeletonTable rows={6} columns={3} />
        </Card>
      ) : total === 0 ? (
        <Card>
          <EmptyState
            title="Nenhuma categoria cadastrada"
            description="Crie categorias para organizar receitas e despesas e acompanhar seus orcamentos."
            icon={<Tags className="size-6" />}
            action={
              <Button
                icon={<Plus className="size-4" />}
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Criar categoria
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingDown className="size-4 text-expense" aria-hidden />
              Despesas
              <span className="text-sm font-normal text-muted">
                ({grouped.expense.filter((c) => c.active).length})
              </span>
            </h2>
            {renderList(grouped.expense, TrendingDown)}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <TrendingUp className="size-4 text-income" aria-hidden />
              Receitas
              <span className="text-sm font-normal text-muted">
                ({grouped.income.filter((c) => c.active).length})
              </span>
            </h2>
            {renderList(grouped.income, TrendingUp)}
          </Card>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar categoria' : 'Nova categoria'}
        description={editing ? undefined : 'O tipo define se a categoria agrupa receitas ou despesas.'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={createCategory.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="category-form"
              loading={createCategory.isPending || updateCategory.isPending}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={submit} className="space-y-4" noValidate>
          <Input
            label="Nome"
            required
            maxLength={120}
            placeholder="Ex.: Mercado, Aluguel, Salario"
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />

          <Select
            label="Tipo"
            required
            value={form.type}
            disabled={Boolean(editing)}
            error={errors.type}
            hint={editing ? 'O tipo nao pode ser alterado depois de criado' : undefined}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CategoryType }))}
          >
            {Object.entries(CATEGORY_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>

          <Input
            label="Icone (opcional)"
            maxLength={60}
            placeholder="Ex.: cart, home, briefcase"
            value={form.icon}
            error={errors.icon}
            onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
          />

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
        title="Desativar categoria"
        message={`"${deleting?.name}" deixara de aparecer nas telas de novo registro, mas o historico sera mantido. Deseja continuar?`}
        confirmLabel="Desativar"
        loading={deactivate.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
