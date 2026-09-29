const ACCESS_KEY = 'financeiro.accessToken';
const REFRESH_KEY = 'financeiro.refreshToken';
const USER_KEY = 'financeiro.user';
const HOUSEHOLD_KEY = 'financeiro.household';

function read<T>(key: string): T | null {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado do navegador */
  }
}

function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  get accessToken(): string | null {
    return read<string>(ACCESS_KEY);
  },
  get refreshToken(): string | null {
    return read<string>(REFRESH_KEY);
  },
  getUser<T>(): T | null {
    return read<T>(USER_KEY);
  },
  getHousehold<T>(): T | null {
    return read<T>(HOUSEHOLD_KEY);
  },
  setSession(session: { accessToken: string; refreshToken: string; user: unknown; household: unknown }) {
    write(ACCESS_KEY, session.accessToken);
    write(REFRESH_KEY, session.refreshToken);
    write(USER_KEY, session.user);
    write(HOUSEHOLD_KEY, session.household);
  },
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    write(ACCESS_KEY, tokens.accessToken);
    write(REFRESH_KEY, tokens.refreshToken);
  },
  setUser(user: unknown) {
    write(USER_KEY, user);
  },
  setHousehold(household: unknown) {
    write(HOUSEHOLD_KEY, household);
  },
  clear() {
    remove(ACCESS_KEY);
    remove(REFRESH_KEY);
    remove(USER_KEY);
    remove(HOUSEHOLD_KEY);
  },
};
