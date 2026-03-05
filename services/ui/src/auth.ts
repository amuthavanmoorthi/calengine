const AUTH_KEY = 'bersn_phase1_auth';
const SESSION_KEY = 'bersn_phase1_session';
const DEMO_USERNAME = 'agency_test';
const DEMO_PASSWORD = 'phase1_demo';
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';

export async function login(username: string, password: string): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await response.json().catch(() => ({}));
  const ok = response.ok && body?.ok === true;
  if (ok) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(SESSION_KEY, String(body.session_id || ''));
  }
  return ok;
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
