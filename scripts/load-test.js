const autocannon = require('autocannon');

const url =
  process.env.LOAD_TEST_URL ??
  'http://localhost:3000/api/ceps/search-by-radius?cep=38400001&raioKm=2';
const connections = Number(process.env.LOAD_TEST_CONNECTIONS ?? 50);
const duration = Number(process.env.LOAD_TEST_DURATION ?? 20);
const maxLatencyMs = Number(process.env.LOAD_TEST_MAX_LATENCY_MS ?? 300);

autocannon(
  {
    url,
    connections,
    duration,
  },
  (error, result) => {
    if (error) {
      console.error(error);
      process.exit(1);
    }

    console.log(`URL: ${url}`);
    console.log(`Connections: ${connections}`);
    console.log(`Duration: ${duration}s`);
    console.log(`Requests/sec avg: ${result.requests.average}`);
    console.log(`Latency avg: ${result.latency.average}ms`);
    console.log(`Latency p97.5: ${result.latency.p97_5}ms`);
    console.log(`Non-2xx responses: ${result.non2xx}`);

    if (result.non2xx > 0) {
      console.error('Load test failed: received non-2xx responses.');
      process.exit(1);
    }

    if (result.latency.p97_5 > maxLatencyMs) {
      console.error(
        `Load test failed: p97.5 ${result.latency.p97_5}ms > ${maxLatencyMs}ms.`,
      );
      process.exit(1);
    }

    console.log('Load test passed.');
  },
);
