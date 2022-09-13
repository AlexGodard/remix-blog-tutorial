// eslint-disable-next-line unicorn/prefer-module,node/no-unpublished-require,@typescript-eslint/no-var-requires,import/no-extraneous-dependencies
const { setupServer } = require('msw/node');

const server = setupServer();

server.listen({ onUnhandledRequest: 'bypass' });
console.info('🔶 Mock server running');

process.once('SIGINT', () => server.close());
process.once('SIGTERM', () => server.close());
