import "dotenv/config";
import { z } from "zod";

// Semua pengaturan dibaca dan diperiksa sekali di sini.
// Kalau ada yang kurang atau lemah, server berhenti dengan pesan yang jelas (bukan error aneh di tengah jalan).
const skema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().min(1, "DATABASE_URL belum diisi"),
    JWT_SECRET: z.string().min(32, "JWT_SECRET minimal 32 karakter. Buat dengan: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""),
    JWT_EXPIRES_IN: z.string().default("8h"),
    // Alamat frontend yang boleh memanggil API dari browser. Pisahkan dengan koma bila lebih dari satu.
    // Lewat proxy Vite (/api) permintaan sudah satu asal, jadi nilai ini hanya perlu untuk deployment terpisah.
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    // Isi 1 bila server berada di belakang reverse proxy (Nginx, Caddy, dll) agar IP asli terbaca untuk pembatas login.
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    // Pembatas percobaan login per IP
    LOGIN_MAX_PERCOBAAN: z.coerce.number().int().min(1).default(10),
    LOGIN_JENDELA_MENIT: z.coerce.number().int().min(1).default(15),
});

const hasil = skema.safeParse(process.env);
if (!hasil.success) {
    console.error("Konfigurasi .env tidak valid:");
    for (const i of hasil.error.issues) console.error(`  - ${i.path.join(".")}: ${i.message}`);
    process.exit(1);
}

const env = hasil.data;

export const config = {
    ...env,
    isProd: env.NODE_ENV === "production",
    corsOrigins: env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean),
};
