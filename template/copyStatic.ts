import { cpSync } from "fs";

cpSync("public", "dist/public", { recursive: true });
cpSync("views", "dist/views", { recursive: true });
