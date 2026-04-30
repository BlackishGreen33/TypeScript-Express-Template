import express, { Router } from "express";

import { RouteType } from "@/types";

import { health, home } from "@/routes/handlers";

type RouterType = {
	path: string;
	router: Router;
};

const routers: RouterType[] = [];

// Add routes here
const routes: RouteType[] = [
	{
		method: "get",
		path: "/",
		middleware: [],
		handler: home
	},
	{
		method: "get",
		path: "/health",
		middleware: [],
		handler: health
	}
];

routes.map((route) => {
	const { method, path, middleware, handler } = route;
	const router = express.Router();
	router[method]("/", ...middleware, handler);
	routers.push({ path, router });
});

export default routers;
