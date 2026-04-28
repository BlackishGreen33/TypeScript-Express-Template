import "module-alias/register";

import debug from "debug";
import http from "http";
import { HttpError } from "http-errors";
import * as dotenv from "dotenv";

import app from "@/app";

dotenv.config();

const port = normalizePort(process.env.PORT || "8000");
app.set("port", port);

const server = http.createServer(app);

function normalizePort<T>(val: T): T | number | false {
	const port = Number(val);

	if (isNaN(port)) {
		return val;
	}

	if (port >= 0) {
		return port;
	}

	return false;
}

function onError(error: HttpError) {
	if (error.syscall !== "listen") {
		throw error;
	}

	const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

	switch (error.code) {
		case "EACCES":
			console.error(bind + " requires elevated privileges");
			process.exit(1);
			break;
		case "EADDRINUSE":
			console.error(bind + " is already in use");
			process.exit(1);
			break;
		default:
			throw error;
	}
}

function onListening() {
	var addr = server.address();
	var bind = typeof addr === "string" ? "pipe " + addr : "port " + addr!.port;
	debug("typescript-express:server")("Listening on " + bind);
}

server.listen(port, () => {
	console.log(`Express with Typescript! http://localhost:${port}`);
});
server.on("error", onError);
server.on("listening", onListening);
