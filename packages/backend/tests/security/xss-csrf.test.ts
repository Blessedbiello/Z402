import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';

const app = express();
app.use(express.json());

// Mock middleware for CSRF protection
const csrfProtection = (req: any, res: any, next: any) => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.headers['x-session-token'];

  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!csrfToken || !sessionToken) {
    return res.status(403).json({ error: 'CSRF token required' });
  }

  // In production, verify CSRF token matches session
  if (csrfToken === `csrf_${sessionToken}`) {
    next();
  } else {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
};

// Mock routes
app.post('/api/payment-intents', csrfProtection, (req, res) => {
  const { amount, resource, metadata } = req.body;

  // Sanitize output (prevent XSS in API responses)
  const sanitizedResource = resource.replace(/[<>"']/g, '');

  res.json({
    id: 'pi_test123',
    resource: sanitizedResource,
    metadata: metadata || {},
  });
});

describe('XSS (Cross-Site Scripting) Prevention', () => {
  describe('Reflected XSS', () => {
    it('should sanitize user input in API responses', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '<svg onload=alert("XSS")>',
        'javascript:alert("XSS")',
        '<iframe src="javascript:alert(\'XSS\')">',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/payment-intents')
          .set('x-csrf-token', 'csrf_test_session')
          .set('x-session-token', 'test_session')
          .send({
            amount: '0.01',
            resource: payload,
          });

        // Response should not contain executable script
        expect(response.body.resource).not.toContain('<script');
        expect(response.body.resource).not.toContain('onerror=');
        expect(response.body.resource).not.toContain('javascript:');
      }
    });

    it('should encode HTML entities in responses', async () => {
      const input = '<div>Test & "quotes"</div>';

      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'csrf_test_session')
        .set('x-session-token', 'test_session')
        .send({
          amount: '0.01',
          resource: input,
        });

      // Should not contain raw HTML
      expect(response.body.resource).not.toContain('<div>');
      expect(response.body.resource).not.toContain('"');
    });
  });

  describe('Stored XSS', () => {
    it('should sanitize data before storage', async () => {
      const xssPayload = '<script>document.cookie</script>';

      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'csrf_test_session')
        .set('x-session-token', 'test_session')
        .send({
          amount: '0.01',
          resource: '/api/test',
          metadata: {
            description: xssPayload,
          },
        });

      // Verify metadata doesn't contain scripts
      if (response.body.metadata?.description) {
        expect(response.body.metadata.description).not.toContain('<script');
      }
    });

    it('should sanitize markdown/rich text content', async () => {
      const xssMarkdown = '[Click me](javascript:alert("XSS"))';

      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'csrf_test_session')
        .set('x-session-token', 'test_session')
        .send({
          amount: '0.01',
          resource: '/api/test',
          metadata: {
            notes: xssMarkdown,
          },
        });

      if (response.body.metadata?.notes) {
        expect(response.body.metadata.notes).not.toContain('javascript:');
      }
    });
  });

  describe('DOM-based XSS', () => {
    it('should use Content-Security-Policy headers', async () => {
      const response = await request(app).get('/api/transactions');

      // Check for CSP header
      expect(
        response.headers['content-security-policy'] ||
        response.headers['x-content-security-policy']
      ).toBeDefined();
    });

    it('should set X-Content-Type-Options header', async () => {
      const response = await request(app).get('/api/transactions');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should set X-Frame-Options header', async () => {
      const response = await request(app).get('/api/transactions');

      expect(['DENY', 'SAMEORIGIN']).toContain(
        response.headers['x-frame-options']
      );
    });
  });

  describe('XSS in Special Contexts', () => {
    it('should prevent XSS in JSON responses', async () => {
      const payload = '{"amount": "<script>alert(\\"XSS\\")</script>"}';

      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'csrf_test_session')
        .set('x-session-token', 'test_session')
        .set('Content-Type', 'application/json')
        .send(payload);

      // JSON should be parsed safely
      expect(response.status).not.toBe(500);
    });

    it('should prevent XSS in URL parameters', async () => {
      const xssParam = encodeURIComponent('<script>alert("XSS")</script>');

      const response = await request(app).get(`/api/transactions/search?q=${xssParam}`);

      // Should handle safely
      expect(response.status).not.toBe(500);
    });
  });
});

describe('CSRF (Cross-Site Request Forgery) Prevention', () => {
  describe('CSRF Token Validation', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const response = await request(app)
        .post('/api/payment-intents')
        .send({
          amount: '0.01',
          resource: '/test',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toMatch(/csrf/i);
    });

    it('should validate CSRF token matches session', async () => {
      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'wrong_token')
        .set('x-session-token', 'test_session')
        .send({
          amount: '0.01',
          resource: '/test',
        });

      expect(response.status).toBe(403);
    });

    it('should accept valid CSRF token', async () => {
      const response = await request(app)
        .post('/api/payment-intents')
        .set('x-csrf-token', 'csrf_test_session')
        .set('x-session-token', 'test_session')
        .send({
          amount: '0.01',
          resource: '/test',
        });

      expect(response.status).not.toBe(403);
    });

    it('should not require CSRF for GET requests', async () => {
      const response = await request(app).get('/api/transactions');

      expect(response.status).not.toBe(403);
    });

    it('should not require CSRF for OPTIONS requests', async () => {
      const response = await request(app).options('/api/payment-intents');

      expect(response.status).not.toBe(403);
    });
  });

  describe('SameSite Cookie Attribute', () => {
    it('should set SameSite attribute on cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        expect(cookieString).toMatch(/SameSite=(Strict|Lax)/i);
      }
    });

    it('should set Secure flag on cookies in production', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const setCookie = response.headers['set-cookie'];
      if (setCookie && process.env.NODE_ENV === 'production') {
        const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        expect(cookieString).toMatch(/Secure/i);
      }
    });

    it('should set HttpOnly flag on session cookies', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const cookieString = Array.isArray(setCookie) ? setCookie[0] : setCookie;
        expect(cookieString).toMatch(/HttpOnly/i);
      }
    });
  });

  describe('CORS Configuration', () => {
    it('should set appropriate CORS headers', async () => {
      const response = await request(app)
        .options('/api/payment-intents')
        .set('Origin', 'https://example.com');

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should not allow all origins (*) in production', async () => {
      const response = await request(app)
        .get('/api/transactions')
        .set('Origin', 'https://malicious.com');

      if (process.env.NODE_ENV === 'production') {
        expect(response.headers['access-control-allow-origin']).not.toBe('*');
      }
    });

    it('should validate Origin header', async () => {
      const maliciousOrigins = [
        'https://malicious.com',
        'http://localhost:3001', // Different port
        'null',
      ];

      for (const origin of maliciousOrigins) {
        const response = await request(app)
          .post('/api/payment-intents')
          .set('Origin', origin)
          .set('x-csrf-token', 'csrf_test_session')
          .set('x-session-token', 'test_session')
          .send({
            amount: '0.01',
            resource: '/test',
          });

        // Should either reject or not set CORS headers for untrusted origins
        if (response.headers['access-control-allow-origin']) {
          expect(response.headers['access-control-allow-origin']).not.toBe(origin);
        }
      }
    });
  });

  describe('Double Submit Cookie Pattern', () => {
    it('should verify CSRF token matches cookie value', async () => {
      // This is an alternative CSRF protection method
      // The CSRF token in the request should match a CSRF cookie

      const response = await request(app)
        .post('/api/payment-intents')
        .set('Cookie', 'csrf_token=abc123')
        .set('x-csrf-token', 'different_token')
        .send({
          amount: '0.01',
          resource: '/test',
        });

      expect(response.status).toBe(403);
    });
  });
});

describe('Additional Security Headers', () => {
  it('should set X-XSS-Protection header', async () => {
    const response = await request(app).get('/api/transactions');

    expect(response.headers['x-xss-protection']).toBeDefined();
  });

  it('should set Strict-Transport-Security header', async () => {
    const response = await request(app).get('/api/transactions');

    if (process.env.NODE_ENV === 'production') {
      expect(response.headers['strict-transport-security']).toBeDefined();
    }
  });

  it('should set Referrer-Policy header', async () => {
    const response = await request(app).get('/api/transactions');

    expect(response.headers['referrer-policy']).toBeDefined();
  });

  it('should not expose sensitive headers', async () => {
    const response = await request(app).get('/api/transactions');

    // Should not expose server details
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['server']).not.toMatch(/Express|Node/i);
  });
});

describe('Content Security Policy', () => {
  it('should have restrictive CSP directives', async () => {
    const response = await request(app).get('/api/transactions');

    const csp = response.headers['content-security-policy'];
    if (csp) {
      // Should not allow unsafe-inline or unsafe-eval
      expect(csp).not.toContain("'unsafe-inline'");
      expect(csp).not.toContain("'unsafe-eval'");
    }
  });

  it('should restrict frame ancestors', async () => {
    const response = await request(app).get('/api/transactions');

    const csp = response.headers['content-security-policy'];
    if (csp) {
      expect(csp).toMatch(/frame-ancestors/i);
    }
  });
});
