import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  ReceiptText,
  Repeat,
  Target,
  Tags,
  Settings,
  Menu,
  X,
  Sun,
  Moon,
  LogOut,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Avatar } from '@/components/ui/primitives';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/', label: 'Painel', icon: LayoutDashboard },
  { to: '/movimentacoes', label: 'Movimentacoes', icon: ArrowLeftRight },
  { to: '/contas', label: 'Contas', icon: Wallet },
  { to: '/contas-a-pagar', label: 'Compromissos', icon: ReceiptText },
  { to: '/orcamentos', label: 'Orcamentos', icon: Target },
];

const SECONDARY_NAV: NavItem[] = [
  { to: '/recorrencias', label: 'Recorrencias', icon: Repeat },
  { to: '/categorias', label: 'Categorias', icon: Tags },
  { to: '/configuracoes', label: 'Configuracoes', icon: Settings },
];

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, household, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const renderNav = (items: NavItem[]) =>
    items.map(({ to, label, icon: Icon }) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        onClick={() => setMobileOpen(false)}
        className={({ isActive }) =>
          `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
            isActive
              ? 'bg-primary/10 text-primary'
              : 'text-muted hover:bg-surface-2 hover:text-foreground'
          }`
        }
      >
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </NavLink>
    ));

  return (
    <div className="flex min-h-screen">
      {/* Barra lateral - desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
            <Wallet className="size-4" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Financas</p>
            <p className="truncate text-xs text-muted-2">{household?.name ?? 'do casal'}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {renderNav(PRIMARY_NAV)}
          <div className="my-3 border-t border-border" />
          {renderNav(SECONDARY_NAV)}
        </nav>

        <div className="border-t border-border p-3">
          <UserMenu name={user?.name ?? ''} email={user?.email ?? ''} onLogout={handleLogout} />
        </div>
      </aside>

      {/* Drawer - mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="animate-in absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-fg">
                  <Wallet className="size-4" aria-hidden />
                </div>
                <p className="text-sm font-semibold">Financas</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn btn-ghost btn-icon"
                aria-label="Fechar menu"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {renderNav(PRIMARY_NAV)}
              <div className="my-3 border-t border-border" />
              {renderNav(SECONDARY_NAV)}
            </nav>
            <div className="border-t border-border p-3">
              <UserMenu name={user?.name ?? ''} email={user?.email ?? ''} onLogout={handleLogout} />
            </div>
          </aside>
        </div>
      )}

      {/* Conteudo */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-surface/85 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="btn btn-ghost btn-icon lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-muted lg:hidden">
            {household?.name ?? 'Financas do casal'}
          </p>

          <div className="hidden flex-1 lg:block" />

          <button
            type="button"
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon"
            aria-label={resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <div className="hidden items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5 text-xs text-muted sm:flex">
            <span className="size-1.5 rounded-full bg-income" aria-hidden />
            Sincronizado
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function UserMenu({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition hover:bg-surface-2"
        aria-expanded={open}
      >
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{name}</span>
          <span className="block truncate text-xs text-muted-2">{email}</span>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-2 transition ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div className="animate-in absolute bottom-full left-0 z-20 mb-1 w-full min-w-48 overflow-hidden rounded-xl border border-border bg-surface shadow-pop">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/configuracoes');
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-sm transition hover:bg-surface-2"
            >
              <Settings className="size-4 text-muted-2" aria-hidden />
              Configuracoes
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-sm text-expense transition hover:bg-expense/10"
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}
