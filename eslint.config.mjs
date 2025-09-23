import globals from "globals";
import esx from "eslint-plugin-es-x";
import js from "@eslint/js";
import compat from "eslint-plugin-compat";

export default [
  {
    files: ["**/*.js"],
    plugins: {
      compat,
      "es-x": esx,
    },
    languageOptions: {
      globals: {
        ...globals.commonjs,
        ...globals.node,
        ...globals.mocha,
        ...globals.browser,
      },

      ecmaVersion: 2022,
      sourceType: "module",
    },

    rules: {
      "no-const-assign": "warn",
      "no-this-before-super": "warn",
      "no-undef": "warn",
      "no-unreachable": "warn",
      "no-unused-vars": "warn",
      "constructor-super": "warn",
      "valid-typeof": "warn",
      ...js.configs.recommended.rules,
      "es-x/no-array-prototype-findlast-findlastindex": "error", // ES2023
      "es-x/no-string-prototype-iswellformed": "error", // ES2024
      "es-x/no-string-prototype-iswellformed-towellformed": "error", // ES2024
      "es-x/no-hashbang": "error", // ES2023
      "compat/compat": "error",
    },
    settings: {
      polyfills: ["AbortSignal"],
      lintAllEsApis: true,
      browsers: ["chrome >= 89", "firefox >= 78"],
    },
  },
];
