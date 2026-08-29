import assert from "node:assert/strict";
import test from "node:test";

import express, { ErrorRequestHandler } from "express";
import request from "supertest";

import { requireAuth } from "@/middleware/auth";

test("auth middleware fails closed without JWT_SECRET", async () => {
	const previousValue = process.env["JWT_SECRET"];
	delete process.env["JWT_SECRET"];

	const app = express();
	app.get("/", requireAuth, (_req, res) => res.sendStatus(204));
	const captureError: ErrorRequestHandler = (error, _req, res, _next) => {
		void _next;
		res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
	};
	app.use(captureError);

	try {
		const response = await request(app)
			.get("/")
			.set("Authorization", "Bearer invalid")
			.expect(500);
		assert.equal(response.body.message, "JWT_SECRET is required");
	} finally {
		if (previousValue === undefined) {
			delete process.env["JWT_SECRET"];
		} else {
			process.env["JWT_SECRET"] = previousValue;
		}
	}
});
