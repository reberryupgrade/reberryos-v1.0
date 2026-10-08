// 리팩터링 안전망: 미정의 변수(no-undef, jsx-no-undef)와 미사용 변수를 잡는다.
import globals from "globals";
import react from "eslint-plugin-react";

export default [
  {
    ignores: ["node_modules/**", ".next/**", "supabase/**"],
  },
  {
    files: ["app/**/*.{js,jsx}", "src/**/*.{js,jsx}", "lib/**/*.js", "tests/**/*.js", "*.mjs"],
    plugins: { react },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node, ...globals.es2024 },
    },
    settings: { react: { version: "detect" } },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", ignoreRestSiblings: true, varsIgnorePattern: "^_" }],
      "react/jsx-uses-vars": "error",
      "react/jsx-no-undef": "error",
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
    },
  },
];
