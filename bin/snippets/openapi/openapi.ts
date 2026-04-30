export const openApiDocument = {
	openapi: "3.1.0",
	info: {
		title: "TypeScript Express API",
		version: "0.1.0"
	},
	paths: {
		"/": {
			get: {
				summary: "Starter greeting",
				responses: {
					"200": {
						description: "Returns the starter greeting."
					}
				}
			}
		},
		"/health": {
			get: {
				summary: "Health check",
				responses: {
					"200": {
						description: "Returns service health."
					}
				}
			}
		}
	}
};
