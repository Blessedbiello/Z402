# k6 Load Tests for Z402

Comprehensive load testing suite for the Z402 payment platform using [k6](https://k6.io/).

## Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

## Test Scenarios

### 1. Payment Intent Creation (`payment-intent-creation.js`)

Tests the performance of creating payment intents under load.

**Scenario**: Gradual ramp-up from 10 to 100 concurrent users over 5 minutes.

**Run**:
```bash
k6 run payment-intent-creation.js \
  --env BASE_URL=http://localhost:3000 \
  --env API_KEY=your_api_key_here
```

**Thresholds**:
- 95% of requests < 500ms
- 99% of requests < 1000ms
- Error rate < 1%

### 2. Complete Payment Flow (`complete-payment-flow.js`)

Tests the entire payment lifecycle: create → retrieve → pay → verify.

**Scenario**: Realistic user flow with 20-50 concurrent users, includes a spike test.

**Run**:
```bash
k6 run complete-payment-flow.js \
  --env BASE_URL=http://localhost:3000 \
  --env API_KEY=your_api_key_here
```

**Thresholds**:
- 95% of requests < 1000ms
- Complete flow < 3000ms (p95)
- Error rate < 2%

### 3. API Endpoints Stress Test (`api-endpoints.js`)

Stress test that pushes the API to its limits with mixed endpoint access.

**Scenario**: Ramp up from 100 to 300 concurrent users over 19 minutes.

**Endpoints tested**:
- List transactions (40%)
- Get analytics (30%)
- Create payment (20%)
- Get transaction (10%)

**Run**:
```bash
k6 run api-endpoints.js \
  --env BASE_URL=http://localhost:3000 \
  --env API_KEY=your_api_key_here
```

**Thresholds**:
- 95% of requests < 2000ms
- 99% of requests < 5000ms
- Error rate < 5% (allows for degradation at peak)

### 4. Rate Limiting Test (`rate-limiting.js`)

Verifies that rate limiting is properly configured and working.

**Scenario**: Constant 100 requests/second for 30 seconds to trigger rate limits.

**Run**:
```bash
k6 run rate-limiting.js \
  --env BASE_URL=http://localhost:3000 \
  --env API_KEY=your_api_key_here
```

**Expected behavior**:
- Should receive 429 responses
- Should include rate limit headers
- Should include Retry-After header

## Running All Tests

Run all load tests sequentially:

```bash
#!/bin/bash

BASE_URL=${BASE_URL:-http://localhost:3000}
API_KEY=${API_KEY:-z402_test_key_12345}

echo "Running k6 load tests..."

echo "\n1. Payment Intent Creation Test"
k6 run payment-intent-creation.js --env BASE_URL=$BASE_URL --env API_KEY=$API_KEY

echo "\n2. Complete Payment Flow Test"
k6 run complete-payment-flow.js --env BASE_URL=$BASE_URL --env API_KEY=$API_KEY

echo "\n3. API Endpoints Stress Test"
k6 run api-endpoints.js --env BASE_URL=$BASE_URL --env API_KEY=$API_KEY

echo "\n4. Rate Limiting Test"
k6 run rate-limiting.js --env BASE_URL=$BASE_URL --env API_KEY=$API_KEY

echo "\nAll tests completed!"
```

## Output and Reporting

### JSON Output

All tests generate JSON summaries for further analysis:

```bash
k6 run payment-intent-creation.js --out json=results.json
```

### HTML Report

Use k6's HTML reporter:

```bash
k6 run payment-intent-creation.js --out json=results.json
k6 report results.json --export report.html
```

### Cloud Output

Send results to k6 Cloud for visualization:

```bash
k6 run payment-intent-creation.js --out cloud
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run k6 Load Tests
  uses: grafana/k6-action@v0.3.1
  with:
    filename: packages/backend/tests/load/payment-intent-creation.js
  env:
    BASE_URL: ${{ secrets.TEST_BASE_URL }}
    API_KEY: ${{ secrets.TEST_API_KEY }}
```

### Docker

```bash
docker run --rm -i --network="host" \
  -e BASE_URL=http://localhost:3000 \
  -e API_KEY=z402_test_key \
  -v $PWD:/tests \
  grafana/k6 run /tests/payment-intent-creation.js
```

## Interpreting Results

### Key Metrics

- **http_req_duration**: How long requests take
  - Look at p(95) and p(99) percentiles
  - Should stay below thresholds even at peak load

- **http_req_failed**: Percentage of failed requests
  - Should be < 1% under normal load
  - May increase slightly under stress

- **http_reqs**: Total number and rate of requests
  - Verify you're achieving expected throughput

- **checks**: Validation checks passed/failed
  - Should be 100% pass for functional correctness

### Performance Targets

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| p(95) response time | < 500ms | 500-1000ms | > 1000ms |
| p(99) response time | < 1000ms | 1000-2000ms | > 2000ms |
| Error rate | < 1% | 1-5% | > 5% |
| Throughput | > 100 rps | 50-100 rps | < 50 rps |

### Common Issues

**High response times**:
- Database query optimization needed
- Redis cache not working
- Too many database connections

**High error rates**:
- Rate limiting too aggressive
- Database connection pool exhausted
- Memory leaks

**Failed thresholds**:
- Scale up infrastructure
- Optimize hot code paths
- Add caching layers

## Best Practices

1. **Start small**: Begin with low load and gradually increase
2. **Test in isolation**: Test one component at a time first
3. **Monitor resources**: Watch CPU, memory, database during tests
4. **Test in staging**: Never run load tests against production
5. **Ramp up gradually**: Give the system time to warm up
6. **Set realistic thresholds**: Based on your SLA requirements

## Troubleshooting

### Connection Refused

Make sure your backend server is running:
```bash
cd packages/backend
npm run dev
```

### Authentication Errors

Verify your API key is correct:
```bash
export API_KEY=z402_test_your_actual_key_here
```

### Rate Limited Immediately

Your rate limits may be too low for load testing. Temporarily increase them or use a test-specific API key with higher limits.

## Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Test Types](https://k6.io/docs/test-types/introduction/)
- [k6 Metrics](https://k6.io/docs/using-k6/metrics/)
- [k6 Thresholds](https://k6.io/docs/using-k6/thresholds/)
