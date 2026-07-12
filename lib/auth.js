import { API_ROUTES } from '@/config';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
}

export async function login(payload) {
  const res = await fetch(API_ROUTES.auth.login, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(payload),
  })
  return res.json();
}

export async function signup(payload) {
  const res = await fetch(API_ROUTES.auth.register, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify(payload),
  });
  return res.json();
}
