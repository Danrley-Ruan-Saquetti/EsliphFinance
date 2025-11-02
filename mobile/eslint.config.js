// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat')
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended')
const { defineConfig } = require('eslint/config')

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*', './.expo/*', './node_modules/*'],
  },
  {
    rules: {
      indent: [
        'off',
        'spaces',
        2
      ],
      'linebreak-style': [
        'off',
        'windows'
      ],
      quotes: [
        'warn',
        'single'
      ],
      semi: [
        'warn',
        'never'
      ],
      curly: [
        'warn',
        'multi-line'
      ],
      eqeqeq: 'off',
      'no-trailing-spaces': 'warn',
      'no-multiple-empty-lines': 'off',
      'no-inline-comments': 'off',
      'no-explicit-any': 'off',
      'prefer-const': 'off',
      'import/prefer-default-export': 'off',
      'no-inner-declarations': 'off',
      'no-empty-pattern': 'off',
      'no-prototype-builtins': 'off',
      camelcase: 'warn',
      'no-tabs': [
        'error',
        {
          allowIndentationTabs: true
        }
      ],
      'prettier/prettier': [
        'off',
        {
          endOfLine: 'auto'
        }
      ],
      'no-async-promise-executor': 'off',
      'no-constant-condition': 'warn',
      'no-empty': 'warn',
      'no-unused-expressions': [
        'warn',
        {
          allowTaggedTemplates: true
        }
      ]
    }
  }
])
