// Membuat / memperbarui akun login. Tidak ada password yang ditulis di kode.
//
// Cara pakai (satu akun):
//   SEED_USERNAME=admin SEED_PASSWORD='password-kuat-anda' npm run seed:user
// Password minimal 10 karakter. Jalankan lagi dengan username yang sama untuk mengganti password.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const username = process.env.SEED_USERNAME?.trim();
const password = process.env.SEED_PASSWORD;

async function main() {
    if (!username || !password) throw new Error("Isi SEED_USERNAME dan SEED_PASSWORD. Contoh: SEED_USERNAME=admin SEED_PASSWORD='...' npm run seed:user");
    if (password.length < 10) throw new Error("Password minimal 10 karakter.");
    if (password.length > 72) throw new Error("Password maksimal 72 karakter.");

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.upsert({
        where: { username },
        update: { password: hash },
        create: { username, password: hash },
    });
    console.log(`User siap: ${username}`);
}

main()
    .catch((e) => { console.error(e.message ?? e); process.exitCode = 1; })
    .finally(() => prisma.$disconnect());
