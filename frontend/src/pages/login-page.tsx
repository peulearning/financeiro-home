import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Wallet, ArrowRight, KeyRound, Users } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ApiError } from '@/lib/api-error';

type Mode = 'login' | 'register';

export function LoginPage() {
  const { user, initializing, login, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    householdName: '',
    inviteCode: '',
  });
  const [useInvite, setUseInvite] = useState(false);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        Carregando...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrors({});
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await login(loginForm.email, loginForm.password);
      toast.success('Bem-vindo de volta!');
      navigate('/', { replace: true });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Nao foi possivel entrar. Tente novamente.';
      setErrors({ password: message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await register({
        name: registerForm.name,
        email: registerForm.email,
        password: registerForm.password,
        ...(useInvite
          ? { inviteCode: registerForm.inviteCode }
          : { householdName: registerForm.householdName }),
      });
      toast.success('Conta criada com sucesso');
      navigate('/', { replace: true });
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        if (Object.keys(error.fieldErrors).length === 0) {
          toast.error(error.message);
        }
      } else {
        toast.error('Nao foi possivel criar a conta');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de apresentacao */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-surface p-12 lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(700px circle at 20% 15%, color-mix(in oklab, var(--primary) 22%, transparent), transparent 60%), radial-gradient(600px circle at 80% 85%, color-mix(in oklab, var(--info) 18%, transparent), transparent 60%)',
          }}
          aria-hidden
        />

        <div className="relative flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-fg">
            <Wallet className="size-5" />
          </div>
          <span className="font-semibold">Financas do Casal</span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Tudo o que voces gastam e ganham, em um so lugar.
          </h1>
          <p className="mt-4 text-muted">
            Contas, dividas, parcelas, orcamentos e metas compartilhadas entre os dois, com tudo
            calculado automaticamente.
          </p>

          <dl className="mt-10 space-y-5">
            {[
              ['Contas e cartoes', 'Acompanhe saldos, faturas e limite disponivel'],
              ['Compromissos parcelados', ' parcele em ate 480x e veja o que vence quando'],
              ['Orcamentos por categoria', ' metas mensais com alerta antes de estourar'],
            ].map(([title, description]) => (
              <div key={title} className="flex gap-3.5">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <div>
                  <dt className="text-sm font-medium">{title}</dt>
                  <dd className="text-sm text-muted">{description}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>

        <p className="relative text-xs text-muted-2">
          Seus dados ficam no seu servidor. Nada e enviado para terceiros.
        </p>
      </div>

      {/* Formulario */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-fg">
              <Wallet className="size-5" />
            </div>
            <span className="font-semibold">Financas do Casal</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar conta'}
          </h2>
          <p className="mt-1.5 text-sm text-muted">
            {mode === 'login'
              ? 'Acesse o painel financeiro da sua familia.'
              : 'Comece um espaco compartilhado ou entre com um codigo de convite.'}
          </p>

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="mt-7 space-y-4" noValidate>
              <Input
                label="E-mail"
                type="email"
                autoComplete="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="voce@email.com"
              />
              <Input
                label="Senha"
                type="password"
                autoComplete="current-password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                error={errors.password}
                placeholder="Sua senha"
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full"
                icon={<ArrowRight className="size-4" />}
              >
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="mt-7 space-y-4" noValidate>
              <Input
                label="Seu nome"
                required
                autoComplete="name"
                value={registerForm.name}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                error={errors.name}
                placeholder="Como voce quer ser chamado"
              />
              <Input
                label="E-mail"
                type="email"
                required
                autoComplete="email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                error={errors.email}
                placeholder="voce@email.com"
              />
              <Input
                label="Senha"
                type="password"
                required
                autoComplete="new-password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                error={errors.password}
                hint="Minimo de 8 caracteres"
                placeholder="Crie uma senha"
              />

              {useInvite ? (
                <Input
                  label="Codigo de convite"
                  required
                  maxLength={12}
                  value={registerForm.inviteCode}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({
                      ...prev,
                      inviteCode: e.target.value.toUpperCase(),
                    }))
                  }
                  error={errors.inviteCode}
                  hint="Codigo de 8 caracteres enviado pelo responsavel"
                  placeholder="ABCD1234"
                  className="font-mono tracking-widest uppercase"
                />
              ) : (
                <Input
                  label="Nome do espaco compartilhado"
                  required
                  value={registerForm.householdName}
                  onChange={(e) =>
                    setRegisterForm((prev) => ({ ...prev, householdName: e.target.value }))
                  }
                  error={errors.householdName}
                  placeholder="Financas da familia"
                />
              )}

              <button
                type="button"
                onClick={() => setUseInvite((prev) => !prev)}
                className="flex items-center gap-1.5 text-xs text-muted transition hover:text-foreground"
              >
                {useInvite ? <KeyRound className="size-3.5" /> : <Users className="size-3.5" />}
                {useInvite ? 'Criar um novo espaco ao invés disso' : 'Tenho um codigo de convite'}
              </button>

              <Button type="submit" loading={loading} className="w-full" icon={<ArrowRight className="size-4" />}>
                Criar conta
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted">
            {mode === 'login' ? 'Ainda nao tem conta?' : 'Ja tem conta?'}{' '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              className="font-medium text-primary hover:underline"
            >
              {mode === 'login' ? 'Criar agora' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
