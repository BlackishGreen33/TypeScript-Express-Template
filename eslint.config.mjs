import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		ignores: ["node_modules/**", "dist/**", "dist-cli/**", "template/**", ".tmp/**", "*.tgz"]
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/cli/**/*.mts"],
		languageOptions: {
			globals: globals.node
		},
		rules: {
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_"
				}
			]
		}
	},
	{
		files: ["bin/**/*.js", "test/**/*.js"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "commonjs",
			globals: globals.node
		},
		rules: {
			"no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_"
				}
			],
			"@typescript-eslint/no-require-imports": "off"
		}
	},
	{
		files: ["*.mjs"],
		languageOptions: {
			ecmaVersion: "latest",
			sourceType: "module",
			globals: globals.node
		}
	}
);
