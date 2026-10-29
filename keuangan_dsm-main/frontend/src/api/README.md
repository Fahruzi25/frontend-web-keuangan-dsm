# Folder api

Setiap file `*.api.js` memanggil backend lewat `http()` di `client.js`. Alamat dasarnya `/api`;
saat `npm run dev`, Vite meneruskannya ke `http://localhost:3000` (lihat `vite.config.ts`).

- Token login disimpan di `sessionStorage` dan dikirim sebagai header `Authorization: Bearer ...`.
- Jika server membalas 401 (sesi habis), pengguna otomatis dikembalikan ke halaman login.
- Format error dari server: `{ message, errors? }`. Halaman form menampilkan `message` lalu `errors`.
- Bentuk data yang dikembalikan sama dengan kontrak yang dipakai halaman (SP2D, cair, sisa, saldo, dst dihitung di server).
