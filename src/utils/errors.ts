/**
 * Error Handling Utilities
 * Provides standardized error handling for n8n API operations
 */

export interface N8nApiError {
  code: string;
  message: string;
  statusCode?: number;
  details?: unknown;
  hint?: string;
}

/**
 * Custom error class for n8n API errors
 */
export class N8nError extends Error {
  public code: string;
  public statusCode?: number;
  public details?: unknown;
  public hint?: string;

  constructor(error: N8nApiError) {
    super(error.message);
    this.name = 'N8nError';
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.details = error.details;
    this.hint = error.hint;
  }

  toJSON(): N8nApiError {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      hint: this.hint,
    };
  }
}

/**
 * Error codes for common scenarios
 */
export const ErrorCodes = {
  // Connection errors
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  TIMEOUT: 'TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_API_KEY: 'INVALID_API_KEY',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  WORKFLOW_NOT_FOUND: 'WORKFLOW_NOT_FOUND',
  EXECUTION_NOT_FOUND: 'EXECUTION_NOT_FOUND',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_WORKFLOW: 'INVALID_WORKFLOW',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Operation errors
  ACTIVATION_FAILED: 'ACTIVATION_FAILED',
  WEBHOOK_ERROR: 'WEBHOOK_ERROR',

  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  API_ERROR: 'API_ERROR',
} as const;

/**
 * Parse error from fetch response or generic error
 */
export function parseError(error: unknown): N8nError {
  // Already an N8nError
  if (error instanceof N8nError) {
    return error;
  }

  // Standard Error
  if (error instanceof Error) {
    // Network errors
    if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
      return new N8nError({
        code: ErrorCodes.CONNECTION_FAILED,
        message: 'Failed to connect to n8n instance',
        hint: 'Check that N8N_API_URL is correct and n8n is running',
      });
    }

    if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      return new N8nError({
        code: ErrorCodes.TIMEOUT,
        message: 'Request timed out',
        hint: 'The n8n server took too long to respond',
      });
    }

    return new N8nError({
      code: ErrorCodes.UNKNOWN_ERROR,
      message: error.message,
    });
  }

  // Unknown error type
  return new N8nError({
    code: ErrorCodes.UNKNOWN_ERROR,
    message: String(error),
  });
}

/**
 * Parse HTTP error response
 */
export function parseHttpError(status: number, body?: string): N8nError {
  let parsedBody: { message?: string; hint?: string } = {};
  
  try {
    if (body) {
      parsedBody = JSON.parse(body);
    }
  } catch {
    // Body is not JSON
  }

  const message = parsedBody.message || `HTTP Error ${status}`;
  const hint = parsedBody.hint;

  switch (status) {
    case 401:
      return new N8nError({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Unauthorized - Invalid API key',
        statusCode: 401,
        hint: hint || 'Check that N8N_API_KEY is correct',
      });

    case 403:
      return new N8nError({
        code: ErrorCodes.FORBIDDEN,
        message: 'Forbidden - Access denied',
        statusCode: 403,
        hint: hint || 'Your API key may not have permission for this operation',
      });

    case 404:
      return new N8nError({
        code: ErrorCodes.NOT_FOUND,
        message: message,
        statusCode: 404,
        hint: hint || 'The requested resource was not found',
      });

    case 422:
      return new N8nError({
        code: ErrorCodes.VALIDATION_ERROR,
        message: message,
        statusCode: 422,
        hint: hint || 'The request data is invalid',
        details: parsedBody,
      });

    case 500:
    case 502:
    case 503:
      return new N8nError({
        code: ErrorCodes.API_ERROR,
        message: 'n8n server error',
        statusCode: status,
        hint: 'The n8n server encountered an error',
      });

    default:
      return new N8nError({
        code: ErrorCodes.API_ERROR,
        message: message,
        statusCode: status,
        hint: hint,
      });
  }
}

/**
 * Format error for MCP response
 */
export function formatErrorResponse(error: unknown): {
  error: string;
  code?: string;
  hint?: string;
  details?: unknown;
} {
  const n8nError = parseError(error);
  
  return {
    error: n8nError.message,
    code: n8nError.code,
    hint: n8nError.hint,
    details: n8nError.details,
  };
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

/**
 * Execute with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (error instanceof N8nError) {
        const nonRetryableCodes = [
          ErrorCodes.UNAUTHORIZED,
          ErrorCodes.FORBIDDEN,
          ErrorCodes.NOT_FOUND,
          ErrorCodes.VALIDATION_ERROR,
        ];

        if (nonRetryableCodes.includes(error.code as any)) {
          throw error;
        }
      }

      // Last attempt, throw the error
      if (attempt === maxRetries) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

