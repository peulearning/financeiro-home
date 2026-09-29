import type { ApiErrorBody } from '@/types';

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, message: string, fieldErrors: Record<string, string> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isUnauthorized() {
    return this.status === 401;
  }

  get isConflict() {
    return this.status === 409;
  }
}

function toFieldErrors(body: ApiErrorBody | undefined): Record<string, string> {
  if (!body?.fieldErrors?.length) return {};
  return body.fieldErrors.reduce<Record<string, string>>((acc, item) => {
    if (item.field) acc[item.field] = item.message;
    return acc;
  }, {});
}

function extractMessage(status: number, raw: string, body: ApiErrorBody | undefined): string {
  if (body?.fieldErrors?.length) {
    return body.fieldErrors.map((f) => f.message).join(' · ');
  }
  if (body?.message) return body.message;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as ApiErrorBody;
      if (parsed?.message) return parsed.message;
    } catch {
      /* resposta nao-JSON */
    }
  }
  if (status === 0) return 'Nao foi possivel conectar ao servidor. Verifique se o backend esta rodando.';
  if (status === 401) return 'Sessao expirada. Entre novamente.';
  return `Erro inesperado (${status})`;
}

export async function parseError(response: Response): Promise<ApiError> {
  const raw = await response.text().catch(() => '');
  let body: ApiErrorBody | undefined;
  try {
    body = raw ? (JSON.parse(raw) as ApiErrorBody) : undefined;
  } catch {
    body = undefined;
  }
  return new ApiError(response.status, extractMessage(response.status, raw, body), toFieldErrors(body));
}
