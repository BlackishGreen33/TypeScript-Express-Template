import js from "@eslint/js";
import globals from "globals";

export default [
	{
		ignores: ["node_modules/**", "dist/**", "template/**", ".tmp/**", "*.tgz"]
	},
	js.configs.recommended,
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
			]
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
];
