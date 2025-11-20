import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Stress test - push the API to its limits
export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 200 },   // Spike to 200
    { duration: '5m', target: 200 },   // Stay at 200
    { duration: '2m', target: 300 },   // Spike to 300
    { duration: '1m', target: 300 },   // Stay at peak
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.05'],    // Allow 5% failures at peak
    errors: ['rate<0.10'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'z402_test_key_12345';

// Weighted scenario selection
const scenarios = [
  { weight: 40, name: 'list_transactions', fn: listTransactions },
  { weight: 30, name: 'get_analytics', fn: getAnalytics },
  { weight: 20, name: 'create_payment', fn: createPayment },
  { weight: 10, name: 'get_transaction', fn: getTransaction },
];

export default function () {
  // Select scenario based on weight
  const rand = Math.random() * 100;
  let cumulative = 0;
  let selectedScenario;

  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (rand < cumulative) {
      selectedScenario = scenario;
      break;
    }
  }

  group(selectedScenario.name, function () {
    selectedScenario.fn();
  });

  sleep(1);
}

function listTransactions() {
  const params = {
    headers: {
      'x-api-key': API_KEY,
    },
  };

  const response = http.get(
    `${BASE_URL}/api/transactions?page=1&limit=20`,
    params
  );

  const success = check(response, {
    'list: status is 200': (r) => r.status === 200,
    'list: has transactions': (r) => {
      const body = JSON.parse(r.body);
      return body.transactions && Array.isArray(body.transactions);
    },
    'list: has pagination': (r) => {
      const body = JSON.parse(r.body);
      return body.pagination !== undefined;
    },
  });

  errorRate.add(!success);
}

function getAnalytics() {
  const params = {
    headers: {
      'x-api-key': API_KEY,
    },
  };

  const endpoints = [
    '/api/analytics/dashboard',
    '/api/analytics/realtime',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  const response = http.get(`${BASE_URL}${endpoint}`, params);

  const success = check(response, {
    'analytics: status is 200': (r) => r.status === 200,
    'analytics: has data': (r) => {
      const body = JSON.parse(r.body);
      return Object.keys(body).length > 0;
    },
  });

  errorRate.add(!success);
}

function createPayment() {
  const payload = JSON.stringify({
    amount: '0.01',
    resource: `/api/test/load-${__VU}-${__ITER}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  const response = http.post(
    `${BASE_URL}/api/payment-intents`,
    payload,
    params
  );

  const success = check(response, {
    'create: status is 201': (r) => r.status === 201,
    'create: has ID': (r) => JSON.parse(r.body).id !== undefined,
  });

  errorRate.add(!success);
}

function getTransaction() {
  // First, create a payment to get an ID
  const createPayload = JSON.stringify({
    amount: '0.01',
    resource: `/api/test/get-${__VU}-${__ITER}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
  };

  const createResponse = http.post(
    `${BASE_URL}/api/payment-intents`,
    createPayload,
    params
  );

  if (createResponse.status === 201) {
    const intent = JSON.parse(createResponse.body);

    // Now retrieve it
    const getResponse = http.get(
      `${BASE_URL}/api/payment-intents/${intent.id}`,
      { headers: { 'x-api-key': API_KEY } }
    );

    const success = check(getResponse, {
      'get: status is 200': (r) => r.status === 200,
      'get: matches ID': (r) => JSON.parse(r.body).id === intent.id,
    });

    errorRate.add(!success);
  }
}

export function handleSummary(data) {
  let summary = '\n========== API Endpoints Stress Test ==========\n\n';

  summary += `Total Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n`;
  summary += `Failed: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;

  summary += 'Response Times:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  p(50): ${data.metrics.http_req_duration.values.med.toFixed(2)}ms\n`;
  summary += `  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n\n`;

  summary += '================================================\n';

  return {
    'summary-api-stress.json': JSON.stringify(data),
    stdout: summary,
  };
}
