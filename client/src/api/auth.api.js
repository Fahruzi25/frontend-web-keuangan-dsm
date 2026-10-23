
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'dsm_user';

export async function login({ username, password }) {
  await delay(500);
  if (username === 'admin' && password === 'dsm2026') {
    const user = { id: 1, username, namaLengkap: 'Admin Keuangan' };
    sessionStorage.setItem(KEY, JSON.stringify(user));
    return user;
  }
  const err = new Error('Kredensial salah');
  err.status = 401;
  throw err;
}

export async function logout() {
  await delay(100);
  sessionStorage.removeItem(KEY);
}

export async function me() {
  const raw = sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}
