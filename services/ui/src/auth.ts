const AUTH_KEY = 'bersn_phase1_auth';
const SESSION_KEY = 'bersn_phase1_session';
const DEMO_USERNAME = 'agency_test';
const DEMO_PASSWORD = 'phase1_demo';
// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';

function clearLegacyPersistentAuth(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function getAuthFlag(): string | null {
  clearLegacyPersistentAuth();
  return sessionStorage.getItem(AUTH_KEY);
}

export class LoginError extends Error {
  kind: 'invalid_credentials' | 'network';

  constructor(kind: 'invalid_credentials' | 'network', message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function login(username: string, password: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch (_error) {
    throw new LoginError(
      'network',
      'Login request failed. Check API deployment URL, CORS policy, and network reachability.',
    );
  }

  const body = await response.json().catch(() => ({}));
  const ok = response.ok && body?.ok === true;
  if (!ok) {
    throw new LoginError('invalid_credentials', 'Invalid credentials for Phase 1 test account.');
  }

  clearLegacyPersistentAuth();
  sessionStorage.setItem(AUTH_KEY, 'true');
  sessionStorage.setItem(SESSION_KEY, String(body.session_id || ''));
}

export function logout(): void {
  clearLegacyPersistentAuth();
  sessionStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return getAuthFlag() === 'true';
}

export function getDemoUsername(): string {
  return DEMO_USERNAME;
}

export function getDemoPassword(): string {
  return DEMO_PASSWORD;
}
