import { Request, Response, RequestHandler as Middleware } from "express";

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

export type HandlerType = (req: Request, res: Response) => any;

export type RouteType = {
	method: Method;
	path: string;
	middleware: Middleware[];
	handler: HandlerType;
};
