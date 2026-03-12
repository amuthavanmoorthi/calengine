const AUTH_KEY = 'bersn_phase1_auth';
const SESSION_KEY = 'bersn_phase1_session';
const DEMO_USERNAME = 'agency_test';
const DEMO_PASSWORD = 'phase1_demo';
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';

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

  localStorage.setItem(AUTH_KEY, 'true');
  localStorage.setItem(SESSION_KEY, String(body.session_id || ''));
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function isLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function getDemoUsername(): string {
  return DEMO_USERNAME;
}

export function getDemoPassword(): string {
  return DEMO_PASSWORD;
}
