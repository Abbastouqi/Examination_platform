// Typed fetch client for the PrepGenius backend.
// - reads access_token from localStorage and adds Authorization header
// - auto-refreshes on 401 using refresh_token (single retry)
// - throws ApiError with the backend `detail` message

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const API_BASE = `${API_URL}/api/v1`;

const ACCESS_KEY = "pg_access_token";
const REFRESH_KEY = "pg_refresh_token";

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

// ---- token storage helpers ----
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_KEY, access);
  if (refresh) window.localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

// Accepts any serializable object/array. Using `object` (rather than a
// Record with an index signature) lets typed request interfaces be passed
// directly without each needing an index signature.
type Json = object | unknown[] | undefined;

interface RequestOpts {
  // when true, send body as application/x-www-form-urlencoded
  form?: boolean;
  // raw body (e.g. FormData) — overrides json
  raw?: BodyInit;
  // skip auth header
  noAuth?: boolean;
  // already retried after refresh
  _retried?: boolean;
  headers?: Record<string, string>;
}

function extractDetail(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  const d = (payload as Record<string, unknown>).detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    // FastAPI validation error array
    const msgs = d
      .map((e) =>
        e && typeof e === "object" && "msg" in e
          ? String((e as Record<string, unknown>).msg)
          : null
      )
      .filter(Boolean);
    if (msgs.length) return msgs.join("; ");
  }
  const m = (payload as Record<string, unknown>).message;
  if (typeof m === "string") return m;
  return fallback;
}

async function tryRefresh(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data?.access_token) {
      setTokens(data.access_token, data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: Json,
  opts: RequestOpts = {}
): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  if (!opts.noAuth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let payload: BodyInit | undefined;
  if (opts.raw !== undefined) {
    payload = opts.raw; // FormData; let browser set content-type
  } else if (opts.form && body && typeof body === "object") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    const usp = new URLSearchParams();
    Object.entries(body as Record<string, unknown>).forEach(([k, v]) => {
      if (v !== undefined && v !== null) usp.append(k, String(v));
    });
    payload = usp.toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = path.startsWith("http")
    ? path
    : `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch (e) {
    throw new ApiError(0, "Network error — could not reach the server.", e);
  }

  // auto-refresh on 401 (single retry)
  if (res.status === 401 && !opts.noAuth && !opts._retried) {
    const ok = await tryRefresh();
    if (ok) {
      return request<T>(method, path, body, { ...opts, _retried: true });
    }
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      extractDetail(data, res.statusText || "Request failed"),
      data
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOpts) =>
    request<T>("GET", path, undefined, opts),
  post: <T>(path: string, body?: Json, opts?: RequestOpts) =>
    request<T>("POST", path, body, opts),
  patch: <T>(path: string, body?: Json, opts?: RequestOpts) =>
    request<T>("PATCH", path, body, opts),
  del: <T>(path: string, opts?: RequestOpts) =>
    request<T>("DELETE", path, undefined, opts),
  // multipart upload helper
  upload: <T>(path: string, form: FormData, opts?: RequestOpts) =>
    request<T>("POST", path, undefined, { ...opts, raw: form }),
};

// ---- generic SSE streaming helper ----
// POSTs {..body, stream:true} to `path` and yields text deltas from an SSE
// stream of `data: {"delta": "..."}` events, plus optional `{"error": "..."}`
// and a final `{"done": true, ...}`. Pass an AbortSignal to support "Stop".
// The final done-event object is returned by the generator.
export async function* streamSSE(
  path: string,
  body: object,
  opts?: { signal?: AbortSignal }
): AsyncGenerator<string, Record<string, unknown>, unknown> {
  const token = getAccessToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, stream: true }),
    signal: opts?.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let detail = "Failed to start stream.";
    try {
      detail = extractDetail(JSON.parse(text), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let doneInfo: Record<string, unknown> = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || !line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const evt = JSON.parse(jsonStr) as Record<string, unknown>;
          if (evt.done) doneInfo = evt;
          else if (evt.error) throw new ApiError(500, String(evt.error));
          else if (typeof evt.delta === "string") yield evt.delta;
        } catch (e) {
          if (e instanceof ApiError) throw e;
          // ignore malformed line
        }
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* ignore */
    }
  }
  return doneInfo;
}

// ---- streaming chat helper ----
export interface StreamChatBody {
  chat_id?: string;
  message: string;
  use_rag: boolean;
}

export interface StreamChatResult {
  deltas: AsyncGenerator<string, void, unknown>;
  // resolves with the final chat_id once the stream signals done
  done: Promise<{ chat_id?: string }>;
}

// Yields text deltas from the SSE stream. The final `data: {"done":true,...}`
// is captured and exposed via the returned `done` promise (also resolved
// when the generator completes).
export async function* streamChat(
  body: StreamChatBody,
  onDone?: (info: { chat_id?: string }) => void
): AsyncGenerator<string, { chat_id?: string }, unknown> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/chat/message`, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let detail = "Failed to start chat stream.";
    try {
      detail = extractDetail(JSON.parse(text), detail);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalInfo: { chat_id?: string } = {};

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by blank lines; lines start with "data: "
      let idx: number;
      // process complete lines
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line || !line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr || jsonStr === "[DONE]") continue;
        try {
          const evt = JSON.parse(jsonStr) as {
            delta?: string;
            done?: boolean;
            chat_id?: string;
          };
          if (evt.done) {
            finalInfo = { chat_id: evt.chat_id };
          } else if (typeof evt.delta === "string") {
            yield evt.delta;
          }
        } catch {
          // ignore malformed line
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (onDone) onDone(finalInfo);
  return finalInfo;
}
