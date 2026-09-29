import { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Users,
  Copy,
  Check,
  Trash2,
  Moon,
  Sun,
  Monitor,
  Plus,
  LogOut,
  ShieldCheck,
  Tags,
  Info,
} from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useCreateInvite,
  useDeactivateCategory,
  useHousehold,
  useInvites,
  useRemoveMember,
  useRenameHousehold,
  useRevokeInvite,
  useUpdateProfile,
} from '@/hooks/use-api';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { useToast } from '@/components/ui/toast';
import { Avatar, Card, Chip, PageHeader } from '@/components/ui/primitives';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/field';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, SkeletonBlock } from '@/components/ui/states';
import { ApiError } from '@/lib/api-error';
import { ACCOUNT_COLORS, CATEGORY_TYPE_LABELS, formatDate } from '@/lib/format';
import type { CategoryType, Invite } from '@/types';

const emptyCategory = { name: '', type: 'EXPENSE' as CategoryType, color: '#10b981', icon: '' };

export function SettingsPage() {
  const toast = useToast();
  const { user, household, logout, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const householdQuery = useHousehold();
  const categories = useCategories(true);
  const createCategory = useCreateCategory();
  const deactivateCategory = useDeactivateCategory();
  const invites = useInvites();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const renameHousehold = useRenameHousehold();
  const removeMember = useRemoveMember();
  const updateProfile = useUpdateProfile();

  const [name, setName] = useState(user?.name ?? '');
  const [householdName, setHouseholdName] = useState(household?.name ?? '');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [form, setForm] = useState(emptyCategory);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [removingCategory, setRemovingCategory] = useState<number | null>(null);
  const [removingMember, setRemovingMember] = useState<{ id: number; name: string } | null>(null);
  const [revoking, setRevoking] = useState<Invite | null>(null);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  useEffect(() => {
    if (household) setHouseholdName(household.name);
  }, [household]);

  useEffect(() => {
    if (!categoryOpen) {
      setForm(emptyCategory);
      setErrors({});
    }
  }, [categoryOpen]);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim() === user?.name) return;
    try {
      await updateProfile.mutateAsync(name.trim());
      await refreshProfile();
      toast.success('Nome atualizado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar');
    }
  };

  const saveHousehold = async (event: React.FormEvent) => {
    event.preventDefault();
    if (householdName.trim() === household?.name) return;
    try {
      await renameHousehold.mutateAsync(householdName.trim());
      await refreshProfile();
      toast.success('Nome do espaco atualizado');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel salvar');
    }
  };

  const copyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Nao foi possivel copiar. Anote o codigo manualmente.');
    }
  };

  const handleCreateInvite = async () => {
    try {
      const invite = await createInvite.mutateAsync();
      await copyInvite(invite.code);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel gerar convite');
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    if (form.name.trim().length < 2) {
      setErrors({ name: 'Informe um nome com pelo menos 2 caracteres' });
      return;
    }
    try {
      await createCategory.mutateAsync({
        name: form.name.trim(),
        type: form.type,
        color: form.color,
        icon: form.icon.trim() || null,
      });
      toast.success('Categoria criada');
      setCategoryOpen(false);
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        setErrors(error.fieldErrors);
        return;
      }
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel criar');
    }
  };

  const handleRemoveCategory = async () => {
    if (removingCategory === null) return;
    try {
      await deactivateCategory.mutateAsync(removingCategory);
      toast.success('Categoria desativada');
      setRemovingCategory(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel desativar');
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    try {
      await removeMember.mutateAsync(removingMember.id);
      toast.success('Membro removido');
      setRemovingMember(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel remover');
    }
  };

  const handleRevoke = async () => {
    if (!revoking) return;
    try {
      await revokeInvite.mutateAsync(revoking.id);
      toast.success('Convite revogado');
      setRevoking(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Nao foi possivel revogar');
    }
  };

  const memberList = household?.members ?? [];
  const inviteList = invites.data ?? [];
  const categoryList = categories.data ?? [];

  return (
    <>
      <PageHeader
        title="Configuracoes"
        subtitle="Perfil, espaco compartilhado, categorias e aparencia"
        actions={
          <Button variant="secondary" icon={<LogOut className="size-4" />} onClick={() => void logout()}>
            Sair da conta
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 flex items-center gap-2 font-semibold">
            <UserIcon className="size-4" aria-hidden /> Perfil
          </h2>
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={user?.name ?? ''} size={48} />
            <div className="min-w-0">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="truncate text-xs text-muted-2">{user?.email}</p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-3">
            <Input
              label="Nome"
              required
              minLength={2}
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input label="E-mail" value={user?.email ?? ''} disabled hint="O e-mail nao pode ser alterado" />
            <Button
              type="submit"
              size="sm"
              loading={updateProfile.isPending}
              disabled={name.trim() === user?.name || name.trim().length < 2}
            >
              Salvar nome
            </Button>
          </form>
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" aria-hidden /> Aparencia
          </h2>
          <p className="mb-4 text-sm text-muted-2">
            O tema fica salvo neste dispositivo e vale para as duas pessoas no mesmo navegador.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['light', 'Claro', Sun],
                ['dark', 'Escuro', Moon],
                ['system', 'Sistema', Monitor],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                aria-pressed={theme === value}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition ${
                  theme === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted hover:border-primary/40 hover:text-foreground'
                }`}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-lg bg-surface-2 p-3 text-xs text-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <p>
              Todos os dados ficam somente no seu servidor. Nenhuma informacao e enviada para
              servicos externos.
            </p>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 font-semibold">
          <Users className="size-4" aria-hidden /> Espaco compartilhado
        </h2>
        <p className="mb-4 text-sm text-muted-2">
          Contas, gastos e orcamentos deste espaco sao visiveis para todos os membros.
        </p>

        <form onSubmit={saveHousehold} className="mb-5 max-w-md space-y-3">
          <Input
            label="Nome do espaco"
            required
            maxLength={120}
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            loading={renameHousehold.isPending}
            disabled={householdName.trim() === household?.name || !householdName.trim()}
          >
            Salvar nome
          </Button>
        </form>

        {householdQuery.isError ? (
          <ErrorState
            message={(householdQuery.error as Error)?.message}
            onRetry={() => householdQuery.refetch()}
          />
        ) : householdQuery.isPending ? (
          <SkeletonBlock className="h-20 w-full" />
        ) : (
          <ul className="divide-y divide-border">
            {memberList.map((member) => (
              <li key={member.id} className="flex items-center gap-3 py-3">
                <Avatar name={member.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {member.name}
                    {member.userId === user?.id && (
                      <span className="ml-1.5 text-xs font-normal text-muted-2">(voce)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-2">
                    Entrou em {formatDate(member.joinedAt)}
                  </p>
                </div>
                <Chip tone={member.role === 'OWNER' ? 'info' : 'muted'}>
                  {member.role === 'OWNER' ? 'Proprietario' : 'Membro'}
                </Chip>
                {member.userId !== user?.id && (
                  <button
                    type="button"
                    onClick={() => setRemovingMember({ id: member.userId, name: member.name })}
                    className="btn btn-ghost btn-icon hover:text-expense"
                    aria-label={`Remover ${member.name}`}
                    title="Remover membro"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Copy className="size-4" aria-hidden /> Convidar parceiro
          </h2>
          <p className="mb-4 text-sm text-muted-2">
            O codigo vale por 7 dias e pode ser usado uma vez. A pessoa cria a conta com o proprio
            e-mail e senha.
          </p>

          {invites.isError ? (
            <ErrorState message={(invites.error as Error)?.message} onRetry={() => invites.refetch()} />
          ) : inviteList.length === 0 ? (
            <EmptyState
              title="Nenhum convite ativo"
              description="Gere um codigo para a outra pessoa entrar no mesmo espaco."
              icon={<Users className="size-5" />}
            />
          ) : (
            <ul className="space-y-2">
              {inviteList.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5"
                >
                  <code className="flex-1 font-mono text-sm tracking-widest">{invite.code}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={copied === invite.code ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    onClick={() => void copyInvite(invite.code)}
                  >
                    {copied === invite.code ? 'Copiado' : 'Copiar'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setRevoking(invite)}
                    className="btn btn-ghost btn-icon hover:text-expense"
                    aria-label={`Revogar convite ${invite.code}`}
                    title="Revogar"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            icon={<Plus className="size-4" />}
            loading={createInvite.isPending}
            onClick={() => void handleCreateInvite()}
          >
            Gerar novo convite
          </Button>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <Tags className="size-4" aria-hidden /> Categorias
          </h2>
          <p className="mb-4 text-sm text-muted-2">
            As categorias padrao ja foram criadas. Voce pode adicionar as suas e desativar as que nao
            usa.
          </p>

          {categories.isError ? (
            <ErrorState
              message={(categories.error as Error)?.message}
              onRetry={() => categories.refetch()}
            />
          ) : categories.isPending ? (
            <SkeletonBlock className="h-48 w-full" />
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {categoryList.map((category) => (
                <li
                  key={category.id}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                    category.active ? '' : 'opacity-50'
                  }`}
                >
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color ?? 'var(--muted-2)' }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
                  <Chip tone={category.type === 'INCOME' ? 'income' : 'expense'}>
                    {CATEGORY_TYPE_LABELS[category.type]}
                  </Chip>
                  {category.active ? (
                    <button
                      type="button"
                      onClick={() => setRemovingCategory(category.id)}
                      className="btn btn-ghost btn-icon hover:text-expense"
                      aria-label={`Desativar ${category.name}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  ) : (
                    <Chip tone="muted">Inativa</Chip>
                  )}
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            icon={<Plus className="size-4" />}
            onClick={() => setCategoryOpen(true)}
          >
            Nova categoria
          </Button>
        </Card>
      </div>

      <Modal
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        title="Nova categoria"
        description="Use um nome curto e uma cor para identificar rapido nos relatorios."
        footer={
          <>
            <Button variant="secondary" onClick={() => setCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form" loading={createCategory.isPending}>
              Criar categoria
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={handleCreateCategory} className="space-y-4" noValidate>
          <Input
            label="Nome"
            required
            maxLength={60}
            placeholder="Ex.: Pets"
            value={form.name}
            error={errors.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <Select
            label="Tipo"
            required
            value={form.type}
            error={errors.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as CategoryType }))}
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>

          <div>
            <span className="label">Cor</span>
            <div className="flex flex-wrap gap-2">
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, color }))}
                  aria-label={`Cor ${color}`}
                  aria-pressed={form.color === color}
                  className={`size-7 rounded-full border-2 transition ${
                    form.color === color ? 'scale-110 border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <Input
            label="Icone (opcional)"
            maxLength={40}
            hint="Nome do icone, como em Lucide: ShoppingCart, Heart, Gift"
            value={form.icon}
            onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
          />
        </form>
      </Modal>

      <ConfirmDialog
        open={removingCategory !== null}
        title="Desativar categoria"
        message="Se nao houver movimentacoes vinculadas, a categoria e excluida. As movimentacoes ja registradas nunca sao apagadas."
        confirmLabel="Desativar"
        loading={deactivateCategory.isPending}
        onConfirm={handleRemoveCategory}
        onCancel={() => setRemovingCategory(null)}
      />

      <ConfirmDialog
        open={Boolean(removingMember)}
        title="Remover membro"
        message={`${removingMember?.name} perdera o acesso aos dados deste espaco. Os lançamentos criados pela pessoa continuam no historico.`}
        confirmLabel="Remover"
        loading={removeMember.isPending}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemovingMember(null)}
      />

      <ConfirmDialog
        open={Boolean(revoking)}
        title="Revogar convite"
        message={`O codigo ${revoking?.code} deixara de funcionar imediatamente.`}
        confirmLabel="Revogar"
        loading={revokeInvite.isPending}
        onConfirm={handleRevoke}
        onCancel={() => setRevoking(null)}
      />
    </>
  );
}
