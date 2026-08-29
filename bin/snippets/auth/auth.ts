import { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

const textEncoder = new TextEncoder();

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
	const authorization = req.headers.authorization;
	const token = authorization?.startsWith("Bearer ")
		? authorization.slice("Bearer ".length)
		: undefined;

	if (!token) {
		res.status(401).json({ message: "Missing bearer token" });
		return;
	}
	if (!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is required");
	}

	try {
		await jwtVerify(token, textEncoder.encode(process.env.JWT_SECRET));
		next();
	} catch {
		res.status(401).json({ message: "Invalid bearer token" });
	}
}
