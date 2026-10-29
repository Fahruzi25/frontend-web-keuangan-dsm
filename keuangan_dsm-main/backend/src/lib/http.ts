import { z } from "zod";

// Error yang sengaja dilempar dari route. Format respons sama dengan yang dibaca frontend:
// { message: "...", errors: ["...", "..."] }
export class HttpError extends Error {
    constructor(public status: number, message: string, public errors?: string[]) {
        super(message);
    }
}

export const tolak = (status: number, message: string, errors?: string[]) => new HttpError(status, message, errors);

// Periksa data masuk dengan skema Zod. Gagal -> 422 dengan daftar pesan per kolom.
export function periksa<T extends z.ZodType>(skema: T, data: unknown, pesanUtama: string): z.infer<T> {
    const hasil = skema.safeParse(data);
    if (!hasil.success) {
        // kolom dalam daftar pekerjaan diberi awalan "Pekerjaan 2: ..." supaya mudah dicari di form
        const rinci = hasil.error.issues.map((i) =>
            i.path[0] === "pekerjaan" && typeof i.path[1] === "number" ? `Pekerjaan ${i.path[1] + 1}: ${i.message}` : i.message);
        throw new HttpError(422, pesanUtama, [...new Set(rinci)]);
    }
    return hasil.data;
}

// id dari URL harus bilangan bulat positif
export function ambilId(param: string | undefined): number {
    const id = Number(param);
    if (!param || !Number.isInteger(id) || id <= 0 || id > 2_147_483_647) throw new HttpError(400, "ID tidak valid.");
    return id;
}
