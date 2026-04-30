const { spawnSync } = require("node:child_process");
const net = require("node:net");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const imageTag = `create-typescript-express-template-smoke:${Date.now()}`;
const containerName = `cte-smoke-${process.pid}-${Date.now()}`;

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd || rootDir,
		encoding: "utf8",
		stdio: options.stdio || "pipe"
	});

	if (result.status !== 0) {
		const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
		throw new Error(`${command} ${args.join(" ")} failed\n${output}`.trim());
	}

	return result.stdout ? result.stdout.trim() : "";
}

function cleanup(command, args) {
	spawnSync(command, args, {
		cwd: rootDir,
		encoding: "utf8",
		stdio: "ignore"
	});
}

function getFreePort() {
	return new Promise((resolve, reject) => {
		const server = net.createServer();
		server.unref();
		server.on("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const { port } = server.address();
			server.close(() => resolve(port));
		});
	});
}

async function waitForHealth(port) {
	const url = `http://127.0.0.1:${port}/health`;
	const deadline = Date.now() + 30000;
	let lastError;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url);
			const body = await response.json();

			if (
				response.status === 200 &&
				body.status === "ok" &&
				body.service === "typescript-express-app"
			) {
				return;
			}

			lastError = new Error(`Unexpected health response: ${response.status}`);
		} catch (error) {
			lastError = error;
		}

		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	throw lastError || new Error(`Timed out waiting for ${url}`);
}

async function main() {
	const port = await getFreePort();

	try {
		run("docker", ["build", "-f", "template/Dockerfile", "-t", imageTag, "template"], {
			stdio: "inherit"
		});
		run("docker", [
			"run",
			"--rm",
			"-d",
			"--name",
			containerName,
			"-p",
			`127.0.0.1:${port}:8000`,
			imageTag
		]);

		await waitForHealth(port);
	} finally {
		cleanup("docker", ["rm", "-f", containerName]);
		cleanup("docker", ["image", "rm", "-f", imageTag]);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
