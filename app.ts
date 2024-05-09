import createError, { HttpError } from "http-errors";
import express, { Application, Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";

import routers from "./routes";

const app: Application = express();

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

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

app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404, 'Not Found'));
});

app.use((err: HttpError, req: Request, res: Response) => {
	res.locals.message = err.message;
	res.locals.error = req.app.get("env") === "development" ? err : {};

	res.status(err.status || 500);
	res.render("error");
});

export default app;
