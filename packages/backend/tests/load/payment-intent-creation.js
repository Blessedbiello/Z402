import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users over 30s
    { duration: '1m', target: 50 },   // Ramp up to 50 users over 1m
    { duration: '2m', target: 100 },  // Ramp up to 100 users over 2m
    { duration: '1m', target: 100 },  // Stay at 100 users for 1m
    { duration: '30s', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1000ms
    http_req_failed: ['rate<0.01'],                  // Error rate < 1%
    errors: ['rate<0.05'],                           // Custom error rate < 5%
  },
};

// Test data
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'z402_test_key_12345';

export default function () {
  // Create payment intent
  const payload = JSON.stringify({
    amount: '0.01',
    resource: `/api/premium/data-${__VU}-${__ITER}`,
    metadata: {
      userId: `user_${__VU}`,
      iteration: __ITER,
    },
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

  // Verify response
  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'has payment intent ID': (r) => JSON.parse(r.body).id !== undefined,
    'has Zcash address': (r) => {
      const body = JSON.parse(r.body);
      return body.zcashAddress &&
             (body.zcashAddress.startsWith('t1') ||
              body.zcashAddress.startsWith('zs1'));
    },
    'response time OK': (r) => r.timings.duration < 500,
  });

  errorRate.add(!success);

  // Think time - simulate user behavior
  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}checks.........................: ${data.metrics.checks.values.passes} / ${data.metrics.checks.values.passes + data.metrics.checks.values.fails} passed\n`;
  summary += `${indent}http_req_duration..............: avg=${data.metrics.http_req_duration.values.avg.toFixed(2)}ms min=${data.metrics.http_req_duration.values.min.toFixed(2)}ms med=${data.metrics.http_req_duration.values.med.toFixed(2)}ms max=${data.metrics.http_req_duration.values.max.toFixed(2)}ms p(95)=${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms p(99)=${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}http_req_failed................: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}% ✓ ${data.metrics.http_req_failed.values.passes} ✗ ${data.metrics.http_req_failed.values.fails}\n`;
  summary += `${indent}http_reqs......................: ${data.metrics.http_reqs.values.count} ${(data.metrics.http_reqs.values.rate).toFixed(2)}/s\n`;

  return summary;
}
