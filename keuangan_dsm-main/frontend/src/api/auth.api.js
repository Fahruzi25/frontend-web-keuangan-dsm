import { ambilToken, hapusSesi, http, simpanSesi, USER_KEY } from './client';

export { USER_KEY };

export async function login({ username, password }) {
  const { token, user } = await http('/auth/login', { method: 'POST', body: { username, password } });
  simpanSesi(token, user);
  return user;
}

export async function logout() {
  try {
    await http('/auth/logout', { method: 'POST' });
  } catch {
    /* tetap keluar di sisi browser walaupun server tidak terjangkau */
  } finally {
    hapusSesi();
  }
}

/** Memeriksa sesi ke server saat halaman dibuka. Token kedaluwarsa atau tidak valid berarti belum masuk. */
export async function me() {
  if (!ambilToken()) return null;
  try {
    return await http('/auth/me');
  } catch (err) {
    if (err.status === 401) hapusSesi();
    return null;
  }
}
