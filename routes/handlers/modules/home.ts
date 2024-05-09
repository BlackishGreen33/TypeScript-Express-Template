import { HandlerType } from "@/types";

export const home: HandlerType = (req, res) => {
	res.status(200).send("Hello World!");
};
