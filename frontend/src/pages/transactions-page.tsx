import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X, Filter, Download } from 'lucide-react';
import {
  useAccounts,
  useCategories,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/use-api';
import { useToast } from '@/components/ui/toast';
import { Card, PageHeader, TransactionIcon } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/field';
import { ConfirmDialog } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonTable } from '@/components/ui/states';
import { TransactionFormDialog } from '@/components/transactions/transaction-form-dialog';
import { formatCurrency, todayIso, TRANSACTION_TYPE_LABELS } from '@/lib/format';
import type { Transaction, TransactionType } from '@/types';

const PAGE_SIZE = 25;

export function TransactionsPage() {
  const toast = useToast();
  const accounts = useAccounts();
  const categories = useCategories();
  const deleteTransaction = useDeleteTransaction();

  const [search, setSearch] = useState('');
  const [type, setType] = useState<TransactionType | ''>('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState(() => `${todayIso().slice(0, 7)}-01`);
  const [to, setTo] = useState(todayIso);
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const filters = useMemo(
    () => ({
      from,
      to,
      accountId: accountId ? Number(accountId) : null,
      categoryId: categoryId ? Number(categoryId) : null,
      type: type || null,
      search,
      page,
      size: PAGE_SIZE,
    }),
    [from, to, accountId, categoryId, type, search, page],
  );

  const query = useTransactions(filters);
  const content = query.data?.content ?? [];
  const totalElements = query.data?.totalElements ?? 0;
  const totalPages = query.data?.totalPages ?? 0;

  const activeFilters =
    (type ? 1 : 0) + (accountId ? 1 : 0) + (categoryId ? 1 : 0) + (search ? 1 : 0);

  const clearFilters = () => {
    setType('');
    setAccountId('');
    setCategoryId('');
    setSearch('');
    setPage(0);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteTransaction.mutateAsync(deleting.id);
      toast.success('Movimentacao excluida');
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel excluir');
    }
  };

  const exportCsv = () => {
    const header = ['Data', 'Descricao', 'Categoria', 'Conta', 'Tipo', 'Valor'];
    const rows = content.map((item) => [
      item.entryDate,
      item.description ?? '',
      item.categoryName ?? '',
      item.accountName,
      TRANSACTION_TYPE_LABELS[item.type],
      String(item.amount),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimentacoes-${from}_a_${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader
        title="Movimentacoes"
        subtitle={`${totalElements} ${totalElements === 1 ? 'lancamento' : 'lancamentos'} no periodo`}
        actions={
          <>
            <Button
              variant="secondary"
              icon={<Filter className="size-4" />}
              onClick={() => setShowFilters((prev) => !prev)}
            >
              Filtros
              {activeFilters > 0 && (
                <span className="ml-0.5 rounded-full bg-primary px-1.5 text-xs text-primary-fg">
                  {activeFilters}
                </span>
              )}
            </Button>
            <Button
              variant="secondary"
              icon={<Download className="size-4" />}
              onClick={exportCsv}
              disabled={content.length === 0}
              title="Exporta a pagina atual em CSV"
            >
              CSV
            </Button>
            <Button
              icon={<Plus className="size-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Nova
            </Button>
          </>
        }
      />

      <Card className="mb-4 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-2"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar por descricao, observacao ou categoria..."
              className="field pl-9"
              aria-label="Buscar movimentacoes"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <label className="block">
              <span className="label">De</span>
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  setFrom(e.target.value);
                  setPage(0);
                }}
                className="field"
              />
            </label>
            <label className="block">
              <span className="label">Ate</span>
              <input
                type="date"
                value={to}
                min={from}
                onChange={(e) => {
                  setTo(e.target.value);
                  setPage(0);
                }}
                className="field"
              />
            </label>
            <Select
              value={type}
              onChange={(e) => {
                setType(e.target.value as TransactionType | '');
                setPage(0);
              }}
              aria-label="Filtrar por tipo"
              className="mt-[1.4rem]"
            >
              <option value="">Todos os tipos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
              <option value="TRANSFER">Transferencias</option>
            </Select>
            <Select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                setPage(0);
              }}
              aria-label="Filtrar por conta"
              className="mt-[1.4rem]"
            >
              <option value="">Todas as contas</option>
              {(accounts.data ?? []).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <div className="w-full sm:w-64">
              <Select
                label="Categoria"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">Todas as categorias</option>
                {(categories.data ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            {activeFilters > 0 && (
              <Button variant="ghost" icon={<X className="size-4" />} onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card>
        {query.isPending ? (
          <SkeletonTable rows={8} columns={5} />
        ) : query.isError ? (
          <ErrorState message={(query.error as Error)?.message} onRetry={() => query.refetch()} />
        ) : content.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentacao encontrada"
            description={
              activeFilters > 0
                ? 'Ajuste os filtros ou o periodo para ver outros lancamentos.'
                : 'Registre sua primeira receita ou despesa para comecar.'
            }
            action={
              activeFilters > 0 ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <Button
                  icon={<Plus className="size-4" />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  Nova movimentacao
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Descricao</th>
                    <th className="hidden md:table-cell">Categoria</th>
                    <th className="hidden lg:table-cell">Conta</th>
                    <th className="text-right">Valor</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {content.map((item) => (
                    <tr key={item.id}>
                      <td className="whitespace-nowrap text-muted tabular-nums">
                        {new Date(item.entryDate).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                        })}
                      </td>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <TransactionIcon type={item.type} />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {item.description || TRANSACTION_TYPE_LABELS[item.type]}
                            </p>
                            <p className="truncate text-xs text-muted-2 md:hidden">
                              {item.categoryName ?? 'Sem categoria'} · {item.accountName}
                            </p>
                            {item.createdByName && (
                              <p className="hidden truncate text-xs text-muted-2 lg:block">
                                por {item.createdByName}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">
                        {item.categoryName ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: item.categoryColor ?? 'var(--muted-2)' }}
                              aria-hidden
                            />
                            {item.categoryName}
                          </span>
                        ) : (
                          <span className="text-muted-2">-</span>
                        )}
                      </td>
                      <td className="hidden whitespace-nowrap text-muted lg:table-cell">
                        {item.accountName}
                      </td>
                      <td
                        className={`text-right font-semibold tabular-nums ${
                          item.type === 'INCOME'
                            ? 'text-income'
                            : item.type === 'EXPENSE'
                              ? 'text-expense'
                              : 'text-foreground'
                        }`}
                      >
                        {item.type === 'EXPENSE' ? '-' : item.type === 'INCOME' ? '+' : ''}
                        {formatCurrency(item.amount)}
                      </td>
                      <td>
                        <div className="flex justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(item);
                              setFormOpen(true);
                            }}
                            className="btn btn-ghost btn-icon"
                            aria-label="Editar"
                            title="Editar"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(item)}
                            className="btn btn-ghost btn-icon hover:text-expense"
                            aria-label="Excluir"
                            title="Excluir"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted">
                  Pagina {page + 1} de {totalPages} · {totalElements} lancamentos
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 0}
                    onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((prev) => prev + 1)}
                  >
                    Proxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <TransactionFormDialog
        open={formOpen}
        transaction={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Excluir movimentacao"
        message={
          deleting?.type === 'TRANSFER'
            ? 'A transferencia sera removida das duas contas. Deseja continuar?'
            : `"${deleting?.description ?? 'Esta movimentacao'}" sera removida permanentemente. Deseja continuar?`
        }
        confirmLabel="Excluir"
        loading={deleteTransaction.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
