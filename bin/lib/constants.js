const DEFAULT_IMPORT_ALIAS = "@/*";

const featureDefinitions = {
	security: {
		label: "Security middleware",
		hint: "helmet, cors, compression, express-rate-limit",
		dependencies: {
			compression: "^1.8.1",
			cors: "^2.8.6",
			"express-rate-limit": "^8.4.1",
			helmet: "^8.1.0"
		},
		devDependencies: {
			"@types/compression": "^1.8.1",
			"@types/cors": "^2.8.19"
		}
	},
	validation: {
		label: "Request validation",
		hint: "zod plus a minimal validated route",
		dependencies: {
			zod: "^4.3.6"
		}
	},
	openapi: {
		label: "OpenAPI docs",
		hint: "swagger-ui-express at /docs and /openapi.json",
		dependencies: {
			"swagger-ui-express": "^5.0.1"
		},
		devDependencies: {
			"@types/swagger-ui-express": "^4.1.8"
		}
	},
	prisma: {
		label: "Prisma",
		hint: "Prisma schema, generated client helper, and scripts",
		dependencies: {
			"@prisma/adapter-better-sqlite3": "^7.8.0",
			"@prisma/client": "^7.8.0"
		},
		devDependencies: {
			"@types/better-sqlite3": "^7.6.13",
			prisma: "^7.8.0"
		}
	},
	auth: {
		label: "JWT auth helper",
		hint: "jose-based bearer token middleware",
		dependencies: {
			jose: "^6.2.3"
		}
	}
};

const supportedFeatures = Object.keys(featureDefinitions);
const supportedPackageManagers = ["npm", "pnpm", "yarn", "bun"];

const togglePackages = {
	views: {
		dependencies: ["pug"]
	},
	logging: {
		dependencies: ["debug", "morgan"],
		devDependencies: ["@types/debug", "@types/morgan"]
	},
	cookies: {
		dependencies: ["cookie-parser"],
		devDependencies: ["@types/cookie-parser"]
	},
	dotenv: {
		dependencies: ["dotenv"]
	}
};

module.exports = {
	DEFAULT_IMPORT_ALIAS,
	featureDefinitions,
	supportedFeatures,
	supportedPackageManagers,
	togglePackages
};
