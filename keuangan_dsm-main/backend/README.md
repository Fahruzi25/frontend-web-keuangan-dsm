# Backend Keuangan DSM

Express 5 + Prisma 7 + PostgreSQL. Bentuk API mengikuti frontend (folder `frontend/src/api`).

## Menjalankan

1. `npm install` (otomatis membuat Prisma Client).
2. Salin `.env.example` menjadi `.env`, isi `DATABASE_URL` dan `JWT_SECRET`
   (buat dengan `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).
3. Buat database kosong `keuangan_dsm` di PostgreSQL, lalu `npm run db:migrate`.
   - Jika database lama masih berisi data contoh, migrasi `sesuaikan_dengan_frontend` menghapus tabel
     project, pekerjaan_project, kelompok_project, pencairan_sp2d, dan rekening lalu membuatnya ulang **kosong**.
     Tabel `users` tidak disentuh. Untuk benar-benar mulai dari nol: `npx prisma migrate reset`.
4. Buat akun login: `SEED_USERNAME=admin SEED_PASSWORD='password-kuat-anda' npm run seed:user`
   (password minimal 10 karakter, tidak pernah ditulis di kode).
5. `npm run dev`, lalu jalankan frontend (`npm run dev` di folder frontend; Vite meneruskan `/api` ke port 3000).

## Endpoint

Semua endpoint selain `/api/auth/login`, `/api/auth/logout`, dan `/api/health` wajib header `Authorization: Bearer <token>`.

| Metode | Alamat | Keterangan |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ username, password }` menghasilkan `{ token, user }` |
| GET | `/api/auth/me` | cek sesi |
| GET/POST | `/api/project` | daftar / tambah project beserta pekerjaannya |
| GET/PUT/DELETE | `/api/project/:id` | detail (dengan transaksi) / ubah / hapus (ditolak bila masih ada transaksi) |
| GET/POST | `/api/transaksi` | daftar + saldo berjalan + ringkasan / tambah |
| GET | `/api/transaksi/kategori` | saran kategori dan jenis operasional |
| GET/PUT/DELETE | `/api/transaksi/:id` | detail / ubah / hapus |
| GET | `/api/operasional?bulan=01..12` | pengeluaran operasional |
| GET | `/api/dashboard` | ringkasan halaman Home |
| GET | `/api/health` | status server dan database |

Koleksi Postman ada di folder `postman`.

## Aturan penting

- **SP2D** = nilai kontrak / 1,11, dikurangi persen PPh yang diketik pengguna per pekerjaan (`persenPotongan`, 0 sampai 100).
- Pencairan = transaksi dana masuk project yang diberi tahap. Total pencairan satu pekerjaan tidak boleh melebihi SP2D
  (baris pekerjaan dikunci saat menyimpan, jadi dua permintaan bersamaan tidak bisa menembus batas).
- Kas hanya untuk dana keluar. Project atau pekerjaan yang masih punya transaksi tidak bisa dihapus.
- SP2D sebuah pekerjaan tidak bisa diubah menjadi lebih kecil dari pencairan yang sudah tercatat.
- Format error: `{ "message": "...", "errors": ["..."] }` (422 isian salah, 409 bentrok data, 401 sesi habis).

## Keamanan

Helmet (header aman), CORS dibatasi `CORS_ORIGIN`, batas 300 permintaan per menit per IP, login dibatasi
10 percobaan gagal per 15 menit per IP, password bcrypt, JWT dikunci HS256 dan berlaku 8 jam,
`JWT_SECRET` wajib minimal 32 karakter (server menolak start jika lemah), ukuran bodi dibatasi 100 KB,
respons error server tidak membocorkan detail, respons API tidak di-cache, semua input divalidasi dengan Zod,
dan batasan data (nominal > 0, kas hanya keluar, dst) dijaga juga oleh CHECK constraint di database.

## Uji

`npm run typecheck`. Uji integrasi memakai database khusus (nama harus berakhiran `_test`, isinya dikosongkan):
`DATABASE_URL=".../keuangan_dsm_test" JWT_SECRET="<32+ karakter>" npm test`
