import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
        value: err.type === 'field' ? err.value : undefined
      }))
    });
  }
  next();
};

/**
 * Company onboarding validation rules
 */
export const validateCompanyOnboarding = [
  body('companyName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name must be between 1 and 255 characters')
    .escape(),
  body('industry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Industry must be less than 100 characters')
    .escape(),
  body('size')
    .optional()
    .isIn(['small', 'medium', 'large'])
    .withMessage('Size must be small, medium, or large'),
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters')
    .escape(),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('primaryMotivation')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Primary motivation must be less than 255 characters')
    .escape(),
  body('currentReportingPeriodStart')
    .optional()
    .isISO8601()
    .withMessage('Reporting period start must be a valid date'),
  body('currentReportingPeriodEnd')
    .optional()
    .isISO8601()
    .withMessage('Reporting period end must be a valid date'),
  handleValidationErrors
];

/**
 * Supplier data validation rules
 */
export const validateSupplierData = [
  body('supplierName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Supplier name must be between 1 and 255 characters')
    .escape(),
  body('supplierCategory')
    .isIn(['bottle_producer', 'label_maker', 'closure_producer', 'secondary_packaging', 'ingredient_supplier', 'contract_distillery'])
    .withMessage('Invalid supplier category'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Website must be a valid URL'),
  body('contactEmail')
    .optional()
    .isEmail()
    .withMessage('Contact email must be valid'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters')
    .escape(),
  body('addressStreet')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Street address must be less than 255 characters')
    .escape(),
  body('addressCity')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must be less than 100 characters')
    .escape(),
  body('addressPostalCode')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Postal code must be less than 50 characters')
    .escape(),
  body('addressCountry')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must be less than 100 characters')
    .escape(),
  handleValidationErrors
];

/**
 * Product data validation rules
 */
export const validateProductData = [
  body('productName')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Product name must be between 1 and 255 characters')
    .escape(),
  body('productDescription')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Product description must be less than 1000 characters')
    .escape(),
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('SKU must be less than 100 characters')
    .escape(),
  body('basePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be 3 characters'),
  body('minimumOrderQuantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum order quantity must be a positive integer'),
  body('leadTimeDays')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Lead time must be a non-negative integer'),
  handleValidationErrors
];

/**
 * File upload validation rules
 */
export const validateFileUpload = [
  body('filePath')
    .trim()
    .matches(/^[a-zA-Z0-9._/-]+$/)
    .withMessage('File path contains invalid characters')
    .isLength({ min: 1, max: 500 })
    .withMessage('File path must be between 1 and 500 characters'),
  handleValidationErrors
];

/**
 * GreenwashGuardian analysis validation
 */
export const validateGreenwashAnalysis = [
  body('type')
    .isIn(['website', 'text'])
    .withMessage('Type must be either "website" or "text"'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 50000 })
    .withMessage('Content must be between 1 and 50000 characters')
    .escape(),
  handleValidationErrors
];

/**
 * UUID parameter validation
 */
export const validateUUIDParam = (paramName: string) => [
  param(paramName)
    .isUUID()
    .withMessage(`${paramName} must be a valid UUID`),
  handleValidationErrors
];

/**
 * ID parameter validation
 */
export const validateIDParam = (paramName: string) => [
  param(paramName)
    .isInt({ min: 1 })
    .withMessage(`${paramName} must be a positive integer`),
  handleValidationErrors
];

/**
 * Pagination query validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors
];

/**
 * Carbon footprint data validation
 */
export const validateCarbonFootprintData = [
  body('dataType')
    .isIn(['natural_gas', 'electricity', 'waste_landfill', 'fuel', 'transport', 'purchased_goods'])
    .withMessage('Invalid data type'),
  body('scope')
    .isInt({ min: 1, max: 3 })
    .withMessage('Scope must be 1, 2, or 3'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a non-negative number'),
  body('unit')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Unit must be between 1 and 20 characters')
    .escape(),
  body('reportingPeriodStart')
    .optional()
    .isISO8601()
    .withMessage('Reporting period start must be a valid date'),
  body('reportingPeriodEnd')
    .optional()
    .isISO8601()
    .withMessage('Reporting period end must be a valid date'),
  handleValidationErrors
];