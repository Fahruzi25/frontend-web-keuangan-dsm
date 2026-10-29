import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { config } from "../config";
import { prisma } from "../lib/prisma";
import { periksa, tolak } from "../lib/http";
import { buatToken, requireAuth } from "../middleware/auth";

const router = Router();

// Hash palsu untuk membandingkan password saat username tidak ada,
// supaya waktu respons sama dan penyerang tidak bisa menebak username yang terdaftar.
const HASH_PALSU = bcrypt.hashSync("password-palsu-untuk-penyeimbang-waktu", 10);

const pembatasLogin = rateLimit({
    windowMs: config.LOGIN_JENDELA_MENIT * 60 * 1000,
    limit: config.LOGIN_MAX_PERCOBAAN,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // hanya percobaan gagal yang dihitung
    skipSuccessfulRequests: true,
    handler: (_req, res) => {
        res.status(429).json({ message: `Terlalu banyak percobaan masuk. Coba lagi dalam ${config.LOGIN_JENDELA_MENIT} menit.` });
    },
});

const skemaLogin = z.object({
    username: z.string({ error: "Username wajib diisi." }).trim().min(1, "Username wajib diisi.").max(100, "Username terlalu panjang."),
    // bcrypt hanya membaca 72 byte pertama; batasi supaya tidak dipakai untuk membebani server
    password: z.string({ error: "Password wajib diisi." }).min(1, "Password wajib diisi.").max(72, "Password terlalu panjang."),
});

// POST /api/auth/login
router.post("/login", pembatasLogin, async (req, res) => {
    const { username, password } = periksa(skemaLogin, req.body, "Isi username dan password terlebih dahulu.");

    const user = await prisma.user.findUnique({ where: { username } });
    const cocok = await bcrypt.compare(password, user?.password ?? HASH_PALSU);
    if (!user || !cocok) throw tolak(401, "Username atau password tidak cocok.");

    res.json({
        token: buatToken({ id: user.id, username: user.username }),
        user: { id: user.id, username: user.username, namaLengkap: user.username },
    });
});

// POST /api/auth/logout
// JWT bersifat stateless, token dibuang oleh frontend. Tanpa requireAuth agar tetap sukses saat token sudah habis.
router.post("/logout", (_req, res) => {
    res.json({ ok: true });
});

// GET /api/auth/me  -> dipakai frontend untuk memeriksa sesi saat halaman dibuka
router.get("/me", requireAuth, async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id }, select: { id: true, username: true } });
    if (!user) throw tolak(401, "Akun tidak ditemukan, silakan masuk kembali.");
    res.json({ id: user.id, username: user.username, namaLengkap: user.username });
});

export default router;
