import { RequestHandler } from "express";
import { z } from "zod";

export function validateBody(schema: z.ZodType): RequestHandler {
	return (req, res, next) => {
		const result = schema.safeParse(req.body);

		if (!result.success) {
			res.status(400).json({
				message: "Invalid request body",
				issues: result.error.issues
			});
			return;
		}

		req.body = result.data;
		next();
	};
}
