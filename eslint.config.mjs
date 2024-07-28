// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    formatters: true,
  },
  {
    rules: {
      'style/yield-star-spacing': ['error', 'after'],
      'antfu/top-level-function': 'off',
    },
  },
)
