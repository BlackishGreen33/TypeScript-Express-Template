import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import express from "express";
import request from "supertest";

process.env.NODE_ENV = "production";

// Load the app after NODE_ENV is set so Express initializes in production mode.
const { default: app, errorHandler } = require("../app");

test("GET / returns the template greeting", async () => {
	const response = await request(app).get("/").expect(200);

	assert.equal(response.text, "Hello World!");
});

test("GET /health returns a JSON health response", async () => {
	const response = await request(app).get("/health").expect(200);

	assert.equal(response.body.status, "ok");
	assert.equal(response.body.service, "typescript-express-app");
});

test("GET /not-found uses the app error view without a stack trace", async () => {
	const response = await request(app).get("/not-found").expect(404);

	assert.match(response.text, /<h1>Not Found<\/h1>/);
	assert.match(response.text, /<h2>404<\/h2>/);
	assert.doesNotMatch(response.text, /NotFoundError|app\.ts|node_modules/);
});

test("production 500 responses hide internal error details", async () => {
	const errorApp = express();
	errorApp.set("views", path.join(__dirname, "../views"));
	errorApp.set("view engine", "pug");
	errorApp.get("/", () => {
		throw new Error("sensitive database details");
	});
	errorApp.use(errorHandler);

	const response = await request(errorApp).get("/").expect(500);

	assert.match(response.text, /Internal Server Error/);
	assert.doesNotMatch(response.text, /sensitive database details/);
});
