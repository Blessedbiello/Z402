import swaggerJSDoc from 'swagger-jsdoc';
import config from './index';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Z402 API Documentation',
    version: '1.0.0',
    description: `
# Z402 Payment Facilitator API

Z402 is an x402 payment facilitator for Zcash, providing a Stripe-like developer experience for cryptocurrency micropayments.

## Features

- **x402 Protocol**: HTTP 402 Payment Required implementation
- **Zcash Integration**: Support for transparent and shielded addresses
- **Express Middleware**: Easy route protection with payment requirements
- **Automatic Verification**: Blockchain transaction verification
- **Settlement Tracking**: Confirmation monitoring and auto-settlement
- **Webhooks**: Real-time payment notifications
- **Double-Spend Prevention**: Built-in security measures

## Authentication

Most endpoints require authentication using JWT tokens. To authenticate:

1. Register a merchant account at \`POST /api/v1/auth/register\`
2. Login at \`POST /api/v1/auth/login\` to receive access and refresh tokens
3. Include the access token in the Authorization header: \`Bearer <token>\`

Alternatively, use API keys:
1. Create an API key at \`POST /api/v1/keys\`
2. Include the API key in the X-API-Key header

## Rate Limiting

All endpoints are rate-limited to prevent abuse:
- Authentication: 5 requests per 15 minutes
- General API: 100 requests per 15 minutes
- Analytics: 30 requests per minute
- API Key Creation: 10 keys per day
- Exports: 5 exports per hour

Rate limit information is included in response headers:
- \`X-RateLimit-Limit\`: Maximum requests allowed
- \`X-RateLimit-Remaining\`: Requests remaining
- \`X-RateLimit-Reset\`: When the limit resets

## Webhooks

Configure webhooks to receive real-time notifications about payment events:
- \`payment.verified\`: Payment verified on blockchain
- \`payment.settled\`: Payment settled after confirmations
- \`payment.failed\`: Payment verification failed
- \`payment.expired\`: Payment expired before completion
- \`refund.created\`: Refund initiated
- \`refund.completed\`: Refund completed

Webhooks include an \`X-Z402-Signature\` header for verification.

## Support

- Documentation: https://docs.z402.com
- GitHub: https://github.com/yourusername/z402
- Issues: https://github.com/yourusername/z402/issues
    `,
    contact: {
      name: 'Z402 Support',
      email: 'support@z402.com',
      url: 'https://z402.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: `http://localhost:${config.port}/api/v1`,
      description: 'Development server',
    },
    {
      url: 'https://api.z402.com/v1',
      description: 'Production server',
    },
    {
      url: 'https://testnet-api.z402.com/v1',
      description: 'Testnet server',
    },
  ],
  tags: [
    {
      name: 'Authentication',
      description: 'Merchant authentication and account management',
    },
    {
      name: 'API Keys',
      description: 'API key management for programmatic access',
    },
    {
      name: 'Transactions',
      description: 'Transaction management and history',
    },
    {
      name: 'Webhooks',
      description: 'Webhook configuration and delivery logs',
    },
    {
      name: 'Analytics',
      description: 'Revenue and transaction analytics',
    },
    {
      name: 'X402 Protocol',
      description: 'X402 payment protocol endpoints',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT access token obtained from login',
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for programmatic access',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          error: {
            type: 'string',
            example: 'Error message',
          },
        },
      },
      Merchant: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'merchant_abc123',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'merchant@example.com',
          },
          name: {
            type: 'string',
            example: 'Acme Corp',
          },
          zcashAddress: {
            type: 'string',
            example: 't1YourZcashAddress',
          },
          zcashShieldedAddress: {
            type: 'string',
            nullable: true,
            example: 'zs1YourShieldedAddress',
          },
          isActive: {
            type: 'boolean',
            example: true,
          },
          isVerified: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Transaction: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'tx_abc123',
          },
          amount: {
            type: 'number',
            format: 'decimal',
            example: 0.1,
          },
          currency: {
            type: 'string',
            example: 'ZEC',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'VERIFIED', 'SETTLED', 'FAILED', 'EXPIRED', 'REFUNDED'],
            example: 'SETTLED',
          },
          resourceUrl: {
            type: 'string',
            format: 'uri',
            example: 'https://api.example.com/data',
          },
          transactionId: {
            type: 'string',
            nullable: true,
            example: 'blockchain_txid',
          },
          clientAddress: {
            type: 'string',
            nullable: true,
            example: 't1ClientAddress',
          },
          confirmations: {
            type: 'integer',
            example: 6,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
          settledAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
        },
      },
      ApiKey: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'key_abc123',
          },
          name: {
            type: 'string',
            example: 'Production API Key',
          },
          keyPrefix: {
            type: 'string',
            example: 'sk_live_',
          },
          permissions: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['read', 'write'],
          },
          lastUsedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          expiresAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      WebhookDelivery: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'wh_abc123',
          },
          eventType: {
            type: 'string',
            example: 'payment.settled',
          },
          status: {
            type: 'string',
            enum: ['PENDING', 'DELIVERED', 'FAILED'],
            example: 'DELIVERED',
          },
          attempts: {
            type: 'integer',
            example: 1,
          },
          deliveredAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
          },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            example: 1,
          },
          limit: {
            type: 'integer',
            example: 20,
          },
          total: {
            type: 'integer',
            example: 100,
          },
          totalPages: {
            type: 'integer',
            example: 5,
          },
          hasMore: {
            type: 'boolean',
            example: true,
          },
        },
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Authentication required',
            },
          },
        },
      },
      ForbiddenError: {
        description: 'Access forbidden',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Access forbidden',
            },
          },
        },
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error',
            },
            example: {
              success: false,
              error: 'Resource not found',
            },
          },
        },
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                error: {
                  type: 'string',
                  example: 'Too many requests',
                },
                retryAfter: {
                  type: 'integer',
                  description: 'Seconds until rate limit resets',
                  example: 900,
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: {
                  type: 'boolean',
                  example: false,
                },
                error: {
                  type: 'string',
                  example: 'Validation failed',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'email',
                      },
                      message: {
                        type: 'string',
                        example: 'Invalid email format',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};

const options: swaggerJSDoc.Options = {
  definition: swaggerDefinition,
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './docs/swagger/*.yaml',
    './docs/swagger/*.yml',
  ],
};

export const swaggerSpec = swaggerJSDoc(options);
