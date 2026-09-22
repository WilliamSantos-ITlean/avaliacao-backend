import { API_BASE_KEY, API_KEY_STORAGE, TOKEN_KEY } from './keys';

export type TrafficEntry = {
  id: string;
  at: string;
  method: string;
  path: string;
  status: number;
  ms: number;
  request: unknown;
  response: unknown;
};

export type RequestOptions = {
  method?: string;
  body?: unknown;
  form?: FormData;
  auth?: boolean | string;
  query?: Record<string, string | number | undefined>;
};

type Reporter = (entry: TrafficEntry) => void;

let reporter: Reporter = () => {};

export function setTrafficReporter(next: Reporter) {
  reporter = next;
}

export function getApiBase() {
  return localStorage.getItem(API_BASE_KEY) || '/api';
}

export function setApiBase(value: string) {
  const next = value.trim() || '/api';
  localStorage.setItem(API_BASE_KEY, next);
  return next;
}

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || import.meta.env.VITE_API_KEY || '';
}

export function setApiKey(value: string) {
  const next = value.trim();
  if (!next) localStorage.removeItem(API_KEY_STORAGE);
  else localStorage.setItem(API_KEY_STORAGE, next);
  return getApiKey();
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const base = getApiBase().replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalized}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && `${value}` !== '') params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function redact(value: unknown): unknown {
  if (value instanceof FormData) return '[arquivo]';
  if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  if ('password' in copy) copy.password = '••••••••';
  return copy;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export function messageFrom(body: unknown, status: number) {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.map(String).join(' ');
    if (typeof message === 'string' && message.trim()) return message;
  }
  if (status === 0) return 'Sem resposta da API.';
  return `A API respondeu ${status}.`;
}

function isApiKeyRejection(body: unknown) {
  return messageFrom(body, 401).toLowerCase().includes('x-api-key');
}

function clip(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
  if (!text) return value;
  return text.length > 1800 ? `${text.slice(0, 1800)}…` : value;
}

export async function request(path: string, options: RequestOptions = {}) {
  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers();
  const apiKey = getApiKey();
  if (apiKey) headers.set('x-api-key', apiKey);
  const auth = options.auth ?? true;

  if (auth === true) {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  } else if (typeof auth === 'string' && auth) {
    headers.set('Authorization', `Bearer ${auth}`);
  }

  let payload: BodyInit | undefined;
  if (options.form) {
    payload = options.form;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    payload = JSON.stringify(options.body);
  }

  const started = performance.now();
  const url = buildUrl(path, options.query);

  let response: Response;
  try {
    response = await fetch(url, { method, headers, body: payload });
  } catch (cause) {
    const error = new ApiError(
      0,
      'Não consegui falar com a API. Confira se o Nest está no ar em http://127.0.0.1:3000.',
      cause,
    );
    reporter({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      method,
      path: url,
      status: 0,
      ms: Math.round(performance.now() - started),
      request: redact(options.form ?? options.body ?? null),
      response: error.message,
    });
    throw error;
  }

  const body = await readBody(response);
  reporter({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    method,
    path: url,
    status: response.status,
    ms: Math.round(performance.now() - started),
    request: redact(options.form ?? options.body ?? null),
    response: clip(body),
  });

  if (response.status === 401 && auth === true && !isApiKeyRejection(body)) {
    window.dispatchEvent(new Event('norte:unauthorized'));
  }

  return { status: response.status, body };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const result = await request(path, options);
  if (result.status < 200 || result.status >= 300) {
    throw new ApiError(result.status, messageFrom(result.body, result.status), result.body);
  }
  return result.body as T;
}
