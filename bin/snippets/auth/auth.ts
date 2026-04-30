import { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "change-me-in-development");

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: undefined;

	if (!token) {
		res.status(401).json({ message: "Missing bearer token" });
		return;
	}

	try {
		await jwtVerify(token, secret);
		next();
	} catch {
		res.status(401).json({ message: "Invalid bearer token" });
	}
}
