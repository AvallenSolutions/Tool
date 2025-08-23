import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppValidationError } from './errorHandler';

export type ValidationTarget = 'body' | 'params' | 'query' | 'headers';

/**
 * Zod validation middleware factory
 * Creates middleware to validate request data using Zod schemas
 */
export function validateZod(
  schema: ZodSchema,
  target: ValidationTarget = 'body'
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      (req as any)[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
          value: err.path.length > 0 ? (req as any)[target]?.[err.path[0]] : undefined
        }));
        
        next(new AppValidationError('Validation failed', validationErrors));
      } else {
        next(error);
      }
    }
  };
}

/**
 * Middleware to validate request body with Zod schema
 */
export const validateBody = (schema: ZodSchema) => validateZod(schema, 'body');

/**
 * Middleware to validate request parameters with Zod schema
 */
export const validateParams = (schema: ZodSchema) => validateZod(schema, 'params');

/**
 * Middleware to validate query parameters with Zod schema
 */
export const validateQuery = (schema: ZodSchema) => validateZod(schema, 'query');

/**
 * Middleware to validate request headers with Zod schema
 */
export const validateHeaders = (schema: ZodSchema) => validateZod(schema, 'headers');

/**
 * Combined validation middleware for multiple targets
 */
export function validateRequest(schemas: {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
  headers?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationPromises: Promise<any>[] = [];
      
      // Validate each target if schema is provided
      Object.entries(schemas).forEach(([target, schema]) => {
        if (schema) {
          const data = (req as any)[target];
          const validated = schema.parse(data);
          (req as any)[target] = validated;
        }
      });
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        next(new AppValidationError('Validation failed', validationErrors));
      } else {
        next(error);
      }
    }
  };
}