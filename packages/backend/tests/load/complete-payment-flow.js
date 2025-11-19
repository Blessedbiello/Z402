import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const paymentFlowDuration = new Trend('payment_flow_duration');

// Test configuration - realistic payment flow
export const options = {
  stages: [
    { duration: '1m', target: 20 },   // Ramp up to 20 concurrent users
    { duration: '3m', target: 20 },   // Stay at 20 users for 3m
    { duration: '1m', target: 50 },   // Spike to 50 users
    { duration: '2m', target: 50 },   // Stay at spike
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.02'],
    errors: ['rate<0.05'],
    'payment_flow_duration': ['p(95)<3000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'z402_test_key_12345';

export default function () {
  const startTime = Date.now();

  group('Complete Payment Flow', function () {
    // Step 1: Create payment intent
    let intentId;
    group('Create Payment Intent', function () {
      const payload = JSON.stringify({
        amount: '0.01',
        resource: `/api/test/resource-${__VU}-${__ITER}`,
        metadata: {
          test: true,
          vu: __VU,
          iteration: __ITER,
        },
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      };

      const createResponse = http.post(
        `${BASE_URL}/api/payment-intents`,
        payload,
        params
      );

      const createSuccess = check(createResponse, {
        'create: status is 201': (r) => r.status === 201,
        'create: has intent ID': (r) => {
          const body = JSON.parse(r.body);
          intentId = body.id;
          return intentId !== undefined;
        },
      });

      errorRate.add(!createSuccess);
      sleep(0.5);
    });

    // Step 2: Retrieve payment intent
    group('Retrieve Payment Intent', function () {
      const params = {
        headers: {
          'x-api-key': API_KEY,
        },
      };

      const getResponse = http.get(
        `${BASE_URL}/api/payment-intents/${intentId}`,
        params
      );

      const getSuccess = check(getResponse, {
        'retrieve: status is 200': (r) => r.status === 200,
        'retrieve: matches intent ID': (r) => {
          const body = JSON.parse(r.body);
          return body.id === intentId;
        },
      });

      errorRate.add(!getSuccess);
      sleep(0.5);
    });

    // Step 3: Submit payment (simulate Zcash transaction)
    group('Submit Payment', function () {
      const payload = JSON.stringify({
        transactionId: `zcash_tx_${__VU}_${__ITER}_${Date.now()}`,
      });

      const params = {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
        },
      };

      const payResponse = http.post(
        `${BASE_URL}/api/payment-intents/${intentId}/pay`,
        payload,
        params
      );

      const paySuccess = check(payResponse, {
        'pay: status is 200': (r) => r.status === 200,
        'pay: status is paid': (r) => {
          const body = JSON.parse(r.body);
          return body.status === 'paid';
        },
      });

      errorRate.add(!paySuccess);
      sleep(1);
    });

    // Step 4: Verify payment
    group('Verify Payment', function () {
      const params = {
        headers: {
          'x-api-key': API_KEY,
        },
      };

      const verifyResponse = http.post(
        `${BASE_URL}/api/payment-intents/${intentId}/verify`,
        null,
        params
      );

      const verifySuccess = check(verifyResponse, {
        'verify: status is 200': (r) => r.status === 200,
        'verify: is verified': (r) => {
          const body = JSON.parse(r.body);
          return body.verified === true;
        },
      });

      errorRate.add(!verifySuccess);
    });
  });

  // Track total flow duration
  const flowDuration = Date.now() - startTime;
  paymentFlowDuration.add(flowDuration);

  // Think time between payment flows
  sleep(2);
}

export function handleSummary(data) {
  return {
    'summary-payment-flow.json': JSON.stringify(data),
    stdout: generateTextSummary(data),
  };
}

function generateTextSummary(data) {
  let summary = '\n========== Payment Flow Load Test Summary ==========\n\n';

  // Request stats
  summary += 'HTTP Request Stats:\n';
  summary += `  Total Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `  Requests/sec: ${data.metrics.http_reqs.values.rate.toFixed(2)}\n`;
  summary += `  Failed Requests: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;

  // Duration stats
  summary += 'Response Time:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  Min: ${data.metrics.http_req_duration.values.min.toFixed(2)}ms\n`;
  summary += `  Max: ${data.metrics.http_req_duration.values.max.toFixed(2)}ms\n`;
  summary += `  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `  p(99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  // Payment flow duration
  if (data.metrics.payment_flow_duration) {
    summary += 'Complete Payment Flow Duration:\n';
    summary += `  Avg: ${data.metrics.payment_flow_duration.values.avg.toFixed(2)}ms\n`;
    summary += `  p(95): ${data.metrics.payment_flow_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `  p(99): ${data.metrics.payment_flow_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  // Checks
  const totalChecks = data.metrics.checks.values.passes + data.metrics.checks.values.fails;
  const checkPassRate = (data.metrics.checks.values.passes / totalChecks * 100).toFixed(2);
  summary += 'Checks:\n';
  summary += `  Passed: ${data.metrics.checks.values.passes} / ${totalChecks} (${checkPassRate}%)\n\n`;

  summary += '====================================================\n';

  return summary;
}
