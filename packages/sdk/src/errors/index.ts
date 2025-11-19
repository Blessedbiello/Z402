/**
 * Z402 SDK Error Classes
 */

export class Z402Error extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'Z402Error';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, Z402Error.prototype);
  }
}

export class AuthenticationError extends Z402Error {
  constructor(message: string = 'Authentication failed', details?: any) {
    super(message, 'authentication_error', 401, details);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class InvalidRequestError extends Z402Error {
  constructor(message: string, details?: any) {
    super(message, 'invalid_request_error', 400, details);
    this.name = 'InvalidRequestError';
    Object.setPrototypeOf(this, InvalidRequestError.prototype);
  }
}

export class NotFoundError extends Z402Error {
  constructor(message: string = 'Resource not found', details?: any) {
    super(message, 'not_found', 404, details);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends Z402Error {
  public readonly retryAfter?: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, details?: any) {
    super(message, 'rate_limit_error', 429, details);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class APIError extends Z402Error {
  constructor(message: string, statusCode: number, details?: any) {
    super(message, 'api_error', statusCode, details);
    this.name = 'APIError';
    Object.setPrototypeOf(this, APIError.prototype);
  }
}

export class NetworkError extends Z402Error {
  constructor(message: string = 'Network request failed', details?: any) {
    super(message, 'network_error', 0, details);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class WebhookVerificationError extends Z402Error {
  constructor(message: string = 'Webhook signature verification failed', details?: any) {
    super(message, 'webhook_verification_error', 400, details);
    this.name = 'WebhookVerificationError';
    Object.setPrototypeOf(this, WebhookVerificationError.prototype);
  }
}
