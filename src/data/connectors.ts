import { getValueAtPath } from './path';
import { RequestConfigSchema, type BuilderDataSource, type BuilderProject, type RequestAuth, type RequestConfig } from '../schema/project';

export type RuntimeDataState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data?: unknown;
  error?: string;
  loadedAt?: string;
};

export type RequestExecutionContext = {
  project?: BuilderProject;
  runtimeEnv?: Record<string, string>;
  runtimeState?: Record<string, unknown>;
  dataStates?: Record<string, RuntimeDataState>;
};

const templatePattern = /\{\{\s*([^}]+?)\s*\}\}/g;

const normalizeError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const stringifyTemplateValue = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

const getTemplateValue = (path: string, context?: RequestExecutionContext): unknown => {
  const trimmed = path.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('env.')) {
    return getValueAtPath(context?.runtimeEnv ?? {}, trimmed.slice(4));
  }

  if (trimmed === 'env') return context?.runtimeEnv ?? {};

  if (trimmed.startsWith('state.')) {
    return getValueAtPath(context?.runtimeState ?? {}, trimmed.slice(6));
  }

  if (trimmed === 'state') return context?.runtimeState ?? {};

  if (trimmed.startsWith('source.')) {
    const [, sourceKey, ...rest] = trimmed.split('.');
    if (!sourceKey) return undefined;
    const sourceData = context?.dataStates?.[sourceKey]?.data;
    return rest.length > 0 ? getValueAtPath(sourceData, rest.join('.')) : sourceData;
  }

  if (trimmed.startsWith('project.')) {
    return getValueAtPath(context?.project ?? {}, trimmed.slice(8));
  }

  return getValueAtPath({
    env: context?.runtimeEnv ?? {},
    state: context?.runtimeState ?? {},
    project: context?.project ?? {},
    source: Object.fromEntries(
      Object.entries(context?.dataStates ?? {}).map(([key, value]) => [key, value.data]),
    ),
  }, trimmed);
};

const resolveTemplateString = (input: string, context?: RequestExecutionContext): unknown => {
  const exactMatch = input.trim().match(/^\{\{\s*([^}]+?)\s*\}\}$/);
  if (exactMatch) {
    return getTemplateValue(exactMatch[1], context);
  }

  return input.replace(templatePattern, (_, token) => stringifyTemplateValue(getTemplateValue(token, context)));
};

const resolveTemplatedValue = (value: unknown, context?: RequestExecutionContext): unknown => {
  if (typeof value === 'string') {
    return resolveTemplateString(value, context);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTemplatedValue(item, context));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, resolveTemplatedValue(item, context)]),
    );
  }

  return value;
};

const normalizeRequestConfig = (config: unknown): RequestConfig => {
  return RequestConfigSchema.parse(config ?? {});
};

const applyAuth = (
  auth: RequestAuth,
  headers: Record<string, string>,
  query: URLSearchParams,
  context?: RequestExecutionContext,
) => {
  if (auth.mode === 'none') return;

  const resolvedToken = resolveTemplateString(auth.tokenTemplate ?? '', context);
  const token = typeof resolvedToken === 'string'
    ? resolvedToken
    : stringifyTemplateValue(resolvedToken);

  if (!token) return;

  if (auth.mode === 'bearer') {
    headers[auth.headerName || 'Authorization'] = `${auth.prefix ?? 'Bearer '}${token}`;
    return;
  }

  if (auth.placement === 'query') {
    query.set(auth.queryName || 'api_key', token);
    return;
  }

  headers[auth.headerName || 'X-API-Key'] = token;
};

const buildUrlWithQuery = (config: RequestConfig, context?: RequestExecutionContext) => {
  const rawUrl = resolveTemplateString(config.url, context);
  const url = typeof rawUrl === 'string' ? rawUrl : stringifyTemplateValue(rawUrl);
  const nextUrl = new URL(url, window.location.origin);
  const resolvedQuery = resolveTemplatedValue(config.query ?? {}, context) as Record<string, unknown>;

  Object.entries(resolvedQuery).forEach(([key, value]) => {
    if (value == null || value === '') return;

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        nextUrl.searchParams.append(key, stringifyTemplateValue(entry));
      });
      return;
    }

    nextUrl.searchParams.set(key, stringifyTemplateValue(value));
  });

  return nextUrl;
};

const buildHeaders = (config: RequestConfig, context?: RequestExecutionContext) => {
  const resolvedHeaders = resolveTemplatedValue(config.headers ?? {}, context) as Record<string, unknown>;
  const headers = Object.fromEntries(
    Object.entries(resolvedHeaders).map(([key, value]) => [key, stringifyTemplateValue(value)]),
  );

  return headers;
};

const buildBody = (config: RequestConfig, headers: Record<string, string>, context?: RequestExecutionContext) => {
  const method = String(config.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD') return undefined;
  if (config.body == null) return undefined;

  const resolvedBody = resolveTemplatedValue(config.body, context);
  const contentTypeHeader = Object.keys(headers).find((key) => key.toLowerCase() === 'content-type');
  const contentType = contentTypeHeader ? headers[contentTypeHeader] : '';

  if (typeof resolvedBody === 'string') {
    if (!contentTypeHeader) {
      headers['Content-Type'] = 'text/plain';
    }
    return resolvedBody;
  }

  if (!contentTypeHeader) {
    headers['Content-Type'] = 'application/json';
  }

  if (contentType.includes('application/json') || !contentType) {
    return JSON.stringify(resolvedBody);
  }

  return String(resolvedBody);
};

const withTimeout = async <T>(promiseFactory: (signal: AbortSignal) => Promise<T>, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await promiseFactory(controller.signal);
  } finally {
    window.clearTimeout(timer);
  }
};

export const executeRequest = async (configInput: unknown, context?: RequestExecutionContext) => {
  const config = normalizeRequestConfig(configInput);
  const url = buildUrlWithQuery(config, context);
  const headers = buildHeaders(config, context);
  applyAuth(config.auth, headers, url.searchParams, context);
  const body = buildBody(config, headers, context);

  const response = await withTimeout(async (signal) => fetch(url.toString(), {
    method: String(config.method ?? 'GET').toUpperCase(),
    headers,
    body,
    signal,
  }), config.timeoutMs ?? 15000);

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return config.pick ? getValueAtPath(payload, config.pick) : payload;
};

const loadMockSource = async (source: Extract<BuilderDataSource, { kind: 'mock' }>, context?: RequestExecutionContext) => {
  return resolveTemplatedValue(source.config?.payload ?? {}, context);
};

const loadRestSource = async (source: Extract<BuilderDataSource, { kind: 'rest' }>, context?: RequestExecutionContext) => {
  return executeRequest(source.config, context);
};

export const loadDataSource = async (source: BuilderDataSource, context?: RequestExecutionContext) => {
  switch (source.kind) {
    case 'mock':
      return loadMockSource(source, context);
    case 'rest':
      return loadRestSource(source, context);
    default:
      throw new Error(`Unsupported data source kind: ${String((source as BuilderDataSource).kind)}`);
  }
};

export const toErrorState = (error: unknown): RuntimeDataState => ({
  status: 'error',
  error: normalizeError(error),
  loadedAt: new Date().toISOString(),
});
