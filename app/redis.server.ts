import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL,
});

client.on('error', (error) => console.error('Redis Client Error', error));

client.connect();

export { client };
