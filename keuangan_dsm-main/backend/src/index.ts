import { app } from "./app";
import { config } from "./config";
import { prisma } from "./lib/prisma";

const server = app.listen(config.PORT, () => {
    console.log(`Backend jalan di http://localhost:${config.PORT} (${config.NODE_ENV})`);
});

// Matikan dengan rapi: selesaikan permintaan yang berjalan lalu tutup koneksi database
async function berhenti(sinyal: string) {
    console.log(`${sinyal} diterima, menutup server...`);
    server.close(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", () => berhenti("SIGINT"));
process.on("SIGTERM", () => berhenti("SIGTERM"));
process.on("unhandledRejection", (e) => console.error("Unhandled rejection:", e));
