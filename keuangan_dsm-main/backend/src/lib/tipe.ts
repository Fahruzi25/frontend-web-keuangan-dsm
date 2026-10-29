import { z } from "zod";

// ===== Angka =====
// Frontend bisa mengirim angka atau teks ("1,75", "750000000"). Keduanya diterima.
export function angkaDariTeks(v: unknown): number {
    if (typeof v === "number") return v;
    if (typeof v !== "string") return NaN;
    const t = v.trim().replace(",", ".");
    return /^\d*\.?\d+$|^\d+\.$/.test(t) ? Number(t) : NaN;
}

export const skemaAngka = (nama: string) =>
    z.preprocess(
        (v) => angkaDariTeks(v),
        z.number({ error: `${nama} harus berupa angka.` }).refine((n) => Number.isFinite(n), `${nama} harus berupa angka.`),
    );

// ===== Tanggal =====
// "YYYY-MM-DD" yang benar-benar ada di kalender (2026-02-30 ditolak).
export function tanggalValid(s: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

export const skemaTanggal = (nama: string) =>
    z.string({ error: `${nama} wajib diisi.` })
        .trim()
        .refine((s) => tanggalValid(s) !== null, `${nama} tidak valid (format YYYY-MM-DD).`);

export const tglKeString = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

// Tanggal hari ini menurut waktu Indonesia (WIB), bukan UTC server.
export function tahunSekarangWib(): number {
    return Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric" }).format(new Date()));
}

// ===== Teks =====
// Hapus spasi di ujung, spasi ganda dirapikan, string kosong menjadi null.
export const teksOpsional = (maks: number, nama: string) =>
    z.preprocess(
        (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") || null : v ?? null),
        z.string().max(maks, `${nama} maksimal ${maks} karakter.`).nullable(),
    );

export const teksWajib = (maks: number, nama: string) =>
    z.preprocess(
        (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v),
        z.string({ error: `${nama} wajib diisi.` }).min(1, `${nama} wajib diisi.`).max(maks, `${nama} maksimal ${maks} karakter.`),
    );

// Rp 1.234.567 untuk pesan error
export const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;
