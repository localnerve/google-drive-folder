const js = require('@eslint/js');
const globals = require('globals');
const jest = require('eslint-plugin-jest');

module.exports = [{
  ignores: [
    '__tests__/lib/**',
    'coverage/**',
    'dist/**',
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
  ...jest.configs['flat/recommended'],
  rules: {
    ...jest.configs['flat/recommended'].rules,
    'jest/no-done-callback': 'off'
  },
  languageOptions: {
    sourceType: 'commonjs',
    globals: {
      ...globals.node
    }
  }
}, {
  files: [
    '__test-package__/**/*.mjs'
  ],
  ...jest.configs['flat/recommended'],
  languageOptions: {
    sourceType: 'module',
    globals: {
      ...globals.node
    }
  }
}];