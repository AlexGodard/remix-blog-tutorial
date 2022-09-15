/**
 * @type {import('@remix-run/dev').AppConfig}
 */
// eslint-disable-next-line unicorn/prefer-module
module.exports = {
  serverDependenciesToBundle: [
    '@table-library/react-table-library',
    '@table-library/react-table-library/compact',
    '@table-library/react-table-library/theme',
    '@table-library/react-table-library/baseline',
    '@table-library/react-table-library/sort',
    '@table-library/react-table-library/table',
    '@table-library/react-table-library/mantine',
    'd3-scale',
    'd3-interpolate',
  ],
  cacheDirectory: './node_modules/.cache/remix',
  ignoredRouteFiles: ['**/.*', '**/*.css', '**/*.test.{js,jsx,ts,tsx}'],
};
