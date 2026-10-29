import { http } from './client';

/** Ringkasan Home, dihitung server dari data yang sama dengan halaman lain. */
export const getDashboard = () => http('/dashboard');
