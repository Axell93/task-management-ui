import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      security.configs.recommended,
      prettierConfig,
    ],
    plugins: { prettier },
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'prettier/prettier': 'warn',
      // Tighten: forbid the two most XSS-prone APIs at the lint layer.
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message:
            'dangerouslySetInnerHTML is forbidden — render text via JSX or sanitise via DOMPurify with an explicit allowlist.',
        },
        {
          selector: "MemberExpression[object.name='document'][property.name='write']",
          message: 'document.write is forbidden.',
        },
      ],
      // We use `window.confirm`/`window.alert` deliberately; relax the
      // security rule that flags string-template selectors in test files.
      'security/detect-object-injection': 'off',
    },
  },
  {
    // Test environment globals.
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.jest } },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
