# Z402 Merchant REST API

Complete REST API for merchant-facing features including authentication, transaction management, webhooks, and analytics.

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm --filter @z402/backend dev
```

### API Documentation

Interactive API documentation is available at:
- **Swagger UI**: `http://localhost:3001/api/v1/docs`
- **OpenAPI JSON**: `http://localhost:3001/api/v1/docs.json`

## Authentication

### JWT Authentication (Recommended for dashboard)

```bash
# Register
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "merchant@example.com",
  "password": "SecurePass123",
  "name": "Acme Corp"
}

# Response includes access & refresh tokens
{
  "success": true,
  "merchant": {...},
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}

# Use token in subsequent requests
Authorization: Bearer eyJhbGc...
```

### API Key Authentication (Recommended for server-to-server)

```bash
# Create API key
POST /api/v1/keys
Authorization: Bearer <access_token>

{
  "name": "Production Server",
  "permissions": ["read", "write"]
}

# Use API key in requests
X-API-Key: sk_live_abc123...
```

## API Endpoints

### 1. Authentication (`/api/v1/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create merchant account |
| POST | `/login` | Login and get JWT tokens |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current merchant info |
| POST | `/verify-email` | Verify email address |
| POST | `/request-password-reset` | Request password reset |
| POST | `/reset-password` | Reset password |
| POST | `/logout` | Logout (creates audit log) |

### 2. API Keys (`/api/v1/keys`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all API keys |
| POST | `/` | Create new API key (returns key once!) |
| GET | `/:id` | Get API key details |
| PUT | `/:id` | Update API key permissions |
| DELETE | `/:id` | Revoke API key |

**Important**: API keys are only shown once during creation. Store them securely!

### 3. Transactions (`/api/v1/transactions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List transactions with filtering |
| GET | `/:id` | Get transaction details |
| POST | `/:id/refund` | Issue refund |
| GET | `/export/data` | Export as CSV/JSON |
| GET | `/stats/summary` | Get statistics |

**Filtering & Pagination:**

```bash
GET /api/v1/transactions?
  page=1&
  limit=20&
  status=SETTLED&
  startDate=2024-01-01T00:00:00Z&
  endDate=2024-01-31T23:59:59Z&
  minAmount=0.1&
  maxAmount=1.0&
  search=premium&
  sortBy=createdAt&
  sortOrder=desc
```

**Export Example:**

```bash
# CSV Export
GET /api/v1/transactions/export/data?format=csv&status=SETTLED

# JSON Export
GET /api/v1/transactions/export/data?format=json&startDate=2024-01-01
```

### 4. Webhook Management (`/api/v1/webhook-management`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get webhook configuration |
| PUT | `/` | Configure webhook endpoint |
| POST | `/test` | Send test webhook |
| GET | `/logs` | View delivery logs |
| POST | `/:id/retry` | Retry failed webhook |
| GET | `/stats` | Get webhook statistics |

**Configure Webhook:**

```bash
PUT /api/v1/webhook-management

{
  "webhookUrl": "https://example.com/webhooks",
  "webhookSecret": "your-secret-key-min-32-chars",
  "enabled": true,
  "events": [
    "payment.verified",
    "payment.settled",
    "payment.failed",
    "refund.created"
  ]
}
```

**Webhook Payload Structure:**

```json
{
  "id": "evt_abc123",
  "type": "payment.settled",
  "data": {
    "id": "tx_abc123",
    "amount": 0.1,
    "status": "SETTLED",
    "merchantId": "merchant_abc123"
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

**Verify Webhook Signature:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const expectedSignature = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-z402-signature'];
  const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);

  if (!isValid) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook...
  res.json({ received: true });
});
```

### 5. Analytics (`/api/v1/analytics`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/overview` | Dashboard overview stats |
| GET | `/revenue` | Revenue over time |
| GET | `/transactions` | Transaction metrics |
| GET | `/top-resources` | Most accessed resources |
| GET | `/payment-methods` | Transparent vs shielded |
| GET | `/customers` | Customer metrics |

**Dashboard Overview:**

```bash
GET /api/v1/analytics/overview?period=30d

# Response includes:
# - Total revenue with growth percentage
# - Transaction counts and success rate
# - Average transaction value
# - Top resource by revenue
# - Recent transactions
```

**Revenue Over Time:**

```bash
GET /api/v1/analytics/revenue?
  startDate=2024-01-01&
  endDate=2024-01-31&
  interval=day&
  currency=ZEC

# Returns daily revenue aggregation
```

**Top Resources:**

```bash
GET /api/v1/analytics/top-resources?
  period=30d&
  limit=10&
  sortBy=revenue

# Returns top 10 resources by revenue with percentages
```

## Rate Limiting

All endpoints are rate-limited to prevent abuse:

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| General API | 100 requests | 15 minutes |
| Analytics | 30 requests | 1 minute |
| API Key Creation | 10 keys | 24 hours |
| Exports | 5 exports | 1 hour |
| Webhook Tests | 10 tests | 1 hour |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-15T12:15:00Z
```

When rate limited, you'll receive:

```json
{
  "success": false,
  "error": "Too many requests, please try again later",
  "retryAfter": 900
}
```

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

**Validation Errors:**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized (missing or invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Pagination

List endpoints support pagination:

```bash
GET /api/v1/transactions?page=1&limit=20

# Response includes pagination metadata
{
  "success": true,
  "transactions": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasMore": true
  }
}
```

## Examples

### Complete Authentication Flow

```javascript
// 1. Register
const registerResponse = await fetch('http://localhost:3001/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'merchant@example.com',
    password: 'SecurePass123',
    name: 'Acme Corp'
  })
});

const { tokens } = await registerResponse.json();

// 2. Use access token
const transactionsResponse = await fetch('http://localhost:3001/api/v1/transactions', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
});

// 3. Refresh when token expires
const refreshResponse = await fetch('http://localhost:3001/api/v1/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: tokens.refreshToken })
});

const newTokens = await refreshResponse.json();
```

### API Key Usage

```javascript
// Create API key (using JWT)
const createKeyResponse = await fetch('http://localhost:3001/api/v1/keys', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Production Server',
    permissions: ['read', 'write']
  })
});

const { apiKey } = await createKeyResponse.json();
// Save apiKey securely - it won't be shown again!

// Use API key in subsequent requests
const response = await fetch('http://localhost:3001/api/v1/transactions', {
  headers: { 'X-API-Key': apiKey }
});
```

### Export Transactions

```javascript
// Export as JSON
const jsonExport = await fetch(
  'http://localhost:3001/api/v1/transactions/export/data?format=json&status=SETTLED',
  { headers: { 'Authorization': `Bearer ${accessToken}` } }
);
const data = await jsonExport.json();

// Export as CSV
const csvExport = await fetch(
  'http://localhost:3001/api/v1/transactions/export/data?format=csv',
  { headers: { 'Authorization': `Bearer ${accessToken}` } }
);
const csvData = await csvExport.text();
```

### Issue a Refund

```javascript
const refundResponse = await fetch(
  'http://localhost:3001/api/v1/transactions/tx_abc123/refund',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: 0.05,  // Partial refund (omit for full refund)
      reason: 'Customer request'
    })
  }
);

const refund = await refundResponse.json();
```

## Testing

Run the API test suite:

```bash
# Unit tests
pnpm --filter @z402/backend test

# Integration tests
pnpm --filter @z402/backend test:integration

# Coverage report
pnpm --filter @z402/backend test:coverage
```

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store API keys securely** - Never commit them to version control
3. **Rotate API keys regularly** - Create new keys and revoke old ones
4. **Verify webhook signatures** - Prevent webhook spoofing
5. **Monitor rate limits** - Implement exponential backoff
6. **Use refresh tokens properly** - Don't store them in localStorage
7. **Validate all inputs** - The API uses Zod for validation
8. **Enable CORS carefully** - Only allow trusted origins

## Support

- **Documentation**: http://localhost:3001/api/v1/docs
- **API Reference**: [X402_GUIDE.md](./X402_GUIDE.md)
- **Database Schema**: [DATABASE.md](./DATABASE.md)
- **Issues**: GitHub Issues

## License

MIT
