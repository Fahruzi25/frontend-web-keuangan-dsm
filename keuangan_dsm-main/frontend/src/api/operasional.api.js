import { http } from './client';

/** Pengeluaran operasional (giro dan kas). bulan: "" (semua) atau "01".."12". */
export const listOperasional = ({ bulan = '' } = {}) => http('/operasional', { params: { bulan } });
