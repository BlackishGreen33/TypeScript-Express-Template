import { Request, Response } from "express";

export function health(_req: Request, res: Response) {
	res.status(200).json({
		status: "ok",
		service: "typescript-express-app"
	});
}
