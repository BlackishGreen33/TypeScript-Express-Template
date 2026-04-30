import { RequestHandler } from "express";

type Method =
	| "get"
	| "head"
	| "post"
	| "put"
	| "delete"
	| "connect"
	| "options"
	| "trace"
	| "patch";

export type RouteType = {
	method: Method;
	path: string;
	middleware: RequestHandler[];
	handler: RequestHandler;
};

export type HandlerType = RequestHandler;
