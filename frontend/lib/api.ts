// The session itself is an HttpOnly cookie that page scripts cannot read. This marker only
// tells the app whether to try restoring a session on load. It holds no secret.
const SESSION_KEY = 'lemo_signed_in';
const LEGACY_TOKEN_KEY = 'devpulse_token';

try {
  // Older versions kept the token in localStorage. Remove it so it cannot be read by page scripts.
  localStorage.removeItem(LEGACY_TOKEN_KEY);
} catch {
  /* storage unavailable */
}

export function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSessionMarker(signedIn: boolean) {
  try {
    if (signedIn) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: the app asks the server on load instead */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = any>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    // Sends the HttpOnly session cookie on same-origin requests.
    credentials: 'same-origin',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) {
    // A 404 with no JSON body means the server answering is not running this version of Lemo (an old process or build).
    if (res.status === 404 && !data) {
      throw new ApiError('This server does not have that feature yet. Stop it and start Lemo again (npm run dev) so it runs the latest code.', 404);
    }
    throw new ApiError(data?.error || `Request failed (${res.status}).`, res.status);
  }
  return data as T;
}
