import globals from "globals";
import js from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";

export default [
  js.configs.recommended,
  {
    plugins: {
      '@stylistic': stylistic
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // 在這裡寫你的風格規則，但記得要加上 `@stylistic/` 前綴
      // 例如:
      // '@stylistic/indent': ['error', 2],
      // '@stylistic/semi': ['error', 'always'],
      // '@stylistic/quotes': ['error', 'single'],
    }
  }
];