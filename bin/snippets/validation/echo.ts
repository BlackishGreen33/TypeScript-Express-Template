import { Request, Response } from "express";
import { z } from "zod";

export const echoSchema = z.object({
	message: z.string().min(1)
});

export function echo(req: Request, res: Response) {
	res.status(201).json({
		message: req.body.message
	});
}
