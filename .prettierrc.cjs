module.exports = {
  plugins: [
    '@trivago/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  singleQuote: true,
  semi: false,
  importOrder: [
    '^react$',
    '^react-router-dom',
    '^@?\\w',
    '^@/components',
    '^@/lib',
    '^@/',
    '^[./]',
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
  tailwindStylesheet: './apps/web/src/index.css',
}
