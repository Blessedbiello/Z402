import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// Custom metrics
const rateLimitHits = new Counter('rate_limit_hits');
const errorRate = new Rate('errors');

// Test configuration - verify rate limiting works
export const options = {
  scenarios: {
    // Burst test - try to hit rate limits
    burst: {
      executor: 'constant-arrival-rate',
      rate: 100,           // 100 requests per second
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 50,
    },
  },
  thresholds: {
    'rate_limit_hits': ['count>0'],     // Should hit rate limits
    'http_req_duration': ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'z402_test_key_12345';

export default function () {
  const payload = JSON.stringify({
    amount: '0.01',
    resource: `/api/test/rate-limit-${Date.now()}`,
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

  const checks = check(response, {
    'status is 201 or 429': (r) => r.status === 201 || r.status === 429,
  });

  // Track rate limit responses
  if (response.status === 429) {
    rateLimitHits.add(1);

    // Verify rate limit headers
    check(response, {
      'has retry-after header': (r) => r.headers['Retry-After'] !== undefined,
      'has rate limit headers': (r) =>
        r.headers['X-RateLimit-Limit'] !== undefined ||
        r.headers['RateLimit-Limit'] !== undefined,
    });
  }

  errorRate.add(!checks);

  // No sleep - we want to hit rate limits
}

export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const rateLimitCount = data.metrics.rate_limit_hits.values.count;
  const rateLimitPercent = (rateLimitCount / totalRequests * 100).toFixed(2);

  let summary = '\n========== Rate Limiting Test Summary ==========\n\n';

  summary += `Total Requests: ${totalRequests}\n`;
  summary += `Rate Limited: ${rateLimitCount} (${rateLimitPercent}%)\n`;
  summary += `Successful: ${totalRequests - rateLimitCount}\n\n`;

  summary += 'Response Times:\n';
  summary += `  Avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `  p(95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n\n`;

  if (rateLimitCount > 0) {
    summary += '✓ Rate limiting is working correctly\n';
  } else {
    summary += '✗ WARNING: No rate limits were hit. Rate limiting may not be configured.\n';
  }

  summary += '\n================================================\n';

  return {
    'summary-rate-limiting.json': JSON.stringify(data),
    stdout: summary,
  };
}
