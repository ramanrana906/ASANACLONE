export const API_URL = import.meta.env.VITE_API_URL;

// Paths that must never trigger a silent refresh-and-retry — refreshing on
// their own 401s would either be pointless (refresh itself) or misleading
// (login/signup failures are credential errors, not expired sessions).
const NO_REFRESH_PATHS = ["/api/auth/login", "/api/auth/signup", "/api/auth/refresh"];

let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function rawFetch(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
}

async function toResult<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body);
      message = parsed.error ?? parsed.message ?? body;
    } catch {
      // not JSON, fall back to raw text
    }
    throw new Error(message || `API error ${res.status}`);
  }

  return res.json();
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await rawFetch(path, options);

  if (res.status === 401 && !NO_REFRESH_PATHS.includes(path)) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return toResult<T>(await rawFetch(path, options));
    }
  }

  return toResult<T>(res);
}
