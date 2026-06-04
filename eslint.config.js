import js from '@eslint/js';
import globals from 'globals';

export default [{
  ignores: [
    '__tests__/lib/**',
    'coverage/**',
    'cjs/**',
    'private/**',
    '**/tmp/**'
  ]
}, {
  files: [
    'lib/**'
  ],
  rules: {
    ...js.configs.recommended.rules
  },
  languageOptions: {
    sourceType: 'module',
    globals: {
      ...globals.node
    }
  }
}, {
  files: [
    '__tests__/**',
    '__test-package__/**/*.{js,cjs}'
  ],
  rules: {
    ...js.configs.recommended.rules
  },
  languageOptions: {
    sourceType: 'module',
    globals: {
      ...globals.node
    }
  }
}, {
  files: [
    '__test-package__/**/*.mjs'
  ],
  rules: {
    ...js.configs.recommended.rules
  },
  languageOptions: {
    sourceType: 'module',
    globals: {
      ...globals.node
    }
  }
}];