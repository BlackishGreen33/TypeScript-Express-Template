import { HandlerType } from "../../../types";

export const home: HandlerType = (_req, res) => {
	res.status(200).send("Hello World!");
};
