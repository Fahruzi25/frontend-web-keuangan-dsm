import express from "express";
import type { NextFunction, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Prisma } from "../generated/prisma/client";
import { config } from "./config";
import { prisma } from "./lib/prisma";
import { HttpError } from "./lib/http";
import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth.routes";
import projectRoutes from "./routes/project.routes";
import transaksiRoutes from "./routes/transaksi.routes";
import operasionalRoutes from "./routes/operasional.routes";
import dashboardRoutes from "./routes/dashboard.routes";

export const app = express();

app.disable("x-powered-by");
if (config.TRUST_PROXY > 0) app.set("trust proxy", config.TRUST_PROXY);

// ===== Keamanan dasar =====
app.use(helmet());
app.use(cors({
    // permintaan tanpa Origin (curl, proxy Vite) tetap boleh; browser dari asal lain hanya jika terdaftar
    origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 600,
}));
app.use("/api", rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, res) => { res.status(429).json({ message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." }); },
}));
app.use(express.json({ limit: "100kb" }));

// Data keuangan tidak boleh disimpan di cache browser atau proxy
app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
});

// ===== Route publik =====
app.get("/api/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok" });
    } catch {
        res.status(503).json({ status: "database tidak terhubung" });
    }
});
app.use("/api/auth", authRoutes);

// ===== Route wajib login =====
app.use("/api/project", requireAuth, projectRoutes);
app.use("/api/transaksi", requireAuth, transaksiRoutes);
app.use("/api/operasional", requireAuth, operasionalRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);

app.use("/api", (_req, res) => {
    res.status(404).json({ message: "Alamat API tidak ditemukan." });
});

// ===== Penanganan error =====
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
        res.status(err.status).json({ message: err.message, ...(err.errors?.length && { errors: err.errors }) });
        return;
    }
    if (err instanceof SyntaxError && "body" in err) {
        res.status(400).json({ message: "Format JSON tidak valid." });
        return;
    }
    if (typeof err === "object" && err !== null && "type" in err && err.type === "entity.too.large") {
        res.status(413).json({ message: "Data yang dikirim terlalu besar." });
        return;
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") { res.status(409).json({ message: "Data sudah ada, ada nilai yang harus unik tetapi sudah dipakai." }); return; }
        if (err.code === "P2025") { res.status(404).json({ message: "Data tidak ditemukan." }); return; }
        if (err.code === "P2003") { res.status(409).json({ message: "Data masih dipakai oleh data lain, jadi tidak bisa dihapus." }); return; }
        if (err.code === "P2034") { res.status(409).json({ message: "Data sedang diubah oleh proses lain. Coba lagi." }); return; }
    }

    // detail error hanya di log server, tidak dikirim ke pengguna
    console.error(err);
    res.status(500).json({ message: "Terjadi kesalahan pada server." });
});
