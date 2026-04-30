import assert from "node:assert/strict";
import test from "node:test";

import request from "supertest";

process.env.NODE_ENV = "production";

// Load the app after NODE_ENV is set so Express initializes in production mode.
const app = require("../app").default;

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
