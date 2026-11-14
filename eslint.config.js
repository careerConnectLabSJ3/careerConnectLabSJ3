import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // 1. Tell ESLint to ignore node_modules and build folders
  {
    ignores: ["**/node_modules/**", "src/client/dist/**"]
  },
  
  // 2. Your main configuration
  { 
    files: ["**/*.{js,mjs,cjs,jsx}"], 
    languageOptions: { globals: globals.browser },
    rules: {
      "prefer-const": "warn",
      "no-constant-binary-expression": "error",
      'one-var': ['warn', 'never'],
      'no-extra-parens': 'warn',
      'block-scoped-var': 'warn',
      'no-cond-assign': ['error', 'always'],
      'no-debugger': 'warn',
      'default-case': 'warn',
      'dot-location': ['warn', 'object'],
      'eqeqeq': 'warn',
      'no-alert': 'warn',
      'no-eq-null': 'warn',
      'no-eval': 'warn',
      'no-implicit-coercion': 'warn',
      'no-lone-blocks': 'error',
      'no-loop-func': 'warn',
      'no-multi-str': 'warn',
      'no-self-compare': 'warn',
      'strict': ['warn', 'global'],
      'no-lonely-if': 'warn',
      ////////// Style //////////
      'array-bracket-spacing': ['error', 'never'],
      'array-bracket-newline': ['error', 'consistent'],
      'comma-spacing': ['error', { 'before': false, 'after': true }],
      'comma-style': ['error', 'last'],
      'brace-style': ['error'],
      'no-tabs': 'error',
      'quotes': ['error', 'single', {'allowTemplateLiterals': true}],
      'jsx-quotes': ['error', 'prefer-double'],
      'space-infix-ops': 'error',
      'space-unary-ops': 'error',
      'semi': 'error',
      'semi-spacing': 'error'
    },
  },
  {
    settings: {
      react: {
        version: "detect"
      }
    }
  }
]);