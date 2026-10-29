import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface TokenPayload {
    id: number;
    username: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

export function buatToken(payload: TokenPayload): string {
    return jwt.sign(payload, config.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });
}

// Middleware: lanjut hanya jika token valid
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ message: "Sesi tidak ditemukan, silakan masuk." });
        return;
    }
    try {
        // algoritma dikunci ke HS256 supaya token berjenis lain (mis. "none") ditolak
        const payload = jwt.verify(header.slice(7), config.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
        req.user = { id: payload.id, username: payload.username };
        next();
    } catch {
        res.status(401).json({ message: "Sesi sudah berakhir, silakan masuk kembali." });
    }
}
