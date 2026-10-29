import { Prisma } from "../../generated/prisma/client";

export const PPN_PERSEN = 11;
export const TAHAP = ["UANG_MUKA", "TERMIN_1", "TERMIN_2", "TERMIN_3", "RETENSI"] as const;
export const LABEL_TAHAP: Record<(typeof TAHAP)[number], string> = {
    UANG_MUKA: "Uang muka", TERMIN_1: "Termin I", TERMIN_2: "Termin II", TERMIN_3: "Termin III", RETENSI: "Retensi",
};

type Desimal = Prisma.Decimal | number | string;

// Rumus SP2D (sama dengan di frontend, src/utils/sp2d.js):
//   DPP  = nilai kontrak / 1,11
//   SP2D = DPP - (DPP x persen PPh / 100)
// Dihitung dengan Decimal supaya tidak ada selisih pembulatan desimal.
export function hitungSp2d(nilaiKontrak: Desimal | null | undefined, persenPotongan: Desimal): Prisma.Decimal {
    const nilai = new Prisma.Decimal(nilaiKontrak ?? 0);
    const dpp = nilai.div(1 + PPN_PERSEN / 100);
    return dpp.minus(dpp.mul(new Prisma.Decimal(persenPotongan)).div(100)).toDecimalPlaces(2);
}
