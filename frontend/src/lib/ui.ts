/** Cores estaveis derivadas de um texto, usadas em avatares sem imagem. */
const AVATAR_COLORS = [
  'bg-emerald-500/15 text-emerald-400',
  'bg-sky-500/15 text-sky-400',
  'bg-violet-500/15 text-violet-400',
  'bg-amber-500/15 text-amber-400',
  'bg-rose-500/15 text-rose-400',
  'bg-cyan-500/15 text-cyan-400',
];

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function formatCompactForAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}mi`;
  if (abs >= 1000) return `${(value / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  return String(Math.round(value));
}

/** Paleta de fallback para categorias sem cor definida. */
export const CHART_PALETTE = [
  '#10b981',
  '#0ea5e9',
  '#8b5cf6',
  '#f97316',
  '#ec4899',
  '#eab308',
  '#06b6d4',
  '#ef4444',
  '#84cc16',
  '#a855f7',
  '#14b8a6',
  '#f43f5e',
];

export function pickColor(index: number, fallback?: string | null): string {
  if (fallback) return fallback;
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
