import createError, { HttpError } from "http-errors";
import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import routers from "@/routes";

const app: Application = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

for (const router of routers) {
	if (router.path && router.router) {
		app.use(router.path, router.router);
	}
}

app.use((_req: Request, _res: Response, next: NextFunction) => {
	next(createError(404, "Not Found"));
});

export function errorHandler(err: HttpError, req: Request, res: Response, _next: NextFunction) {
	const status = err.status || 500;
	const message =
		status >= 500 && req.app.get("env") !== "development"
			? "Internal Server Error"
			: err.message;

	res.locals.message = message;
	res.locals.status = status;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	res.status(status);
	res.render("error");
}

app.use(errorHandler);

export default app;
