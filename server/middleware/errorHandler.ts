import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';
import { ZodError } from 'zod';

// Custom error classes
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class AppValidationError extends AppError {
  public errors: any[];

  constructor(message: string, errors: any[]) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

/**
 * Centralized error handler middleware
 * Handles all errors thrown in the application
 */
export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let errors: any[] = [];

  // Handle custom application errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code || 'APP_ERROR';
    
    if (error instanceof AppValidationError) {
      errors = error.errors;
    }
  }
  // Handle Zod validation errors
  else if (error instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      value: err.code
    }));
  }
  // Handle express-validator errors
  else if (Array.isArray(error) && error[0]?.msg) {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    errors = error.map(err => ({
      field: err.param || err.path,
      message: err.msg,
      value: err.value
    }));
  }
  // Handle database errors
  else if (error.code === '23505') { // Unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
    code = 'DUPLICATE_ERROR';
  }
  else if (error.code === '23503') { // Foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
    code = 'REFERENCE_ERROR';
  }
  // Handle JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    code = 'INVALID_TOKEN';
  }
  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    code = 'TOKEN_EXPIRED';
  }

  // Log error with appropriate level
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user?.id
    },
    statusCode,
    code
  }, `Request failed: ${message}`);

  // Prepare response
  const response: any = {
    success: false,
    error: {
      code,
      message
    }
  };

  // Add validation errors if present
  if (errors.length > 0) {
    response.error.errors = errors;
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  res.status(statusCode).json(response);
}

/**
 * Wrapper for async route handlers to catch errors
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new NotFoundError(`Route not found: ${req.method} ${req.path}`);
  next(error);
}