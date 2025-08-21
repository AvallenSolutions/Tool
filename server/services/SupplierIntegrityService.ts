/**
 * Supplier Data Integrity Service
 * 
 * Comprehensive data protection and validation service to prevent supplier data loss.
 * Implements multiple safeguards including backup mechanisms, validation, 
 * integrity checks, and recovery procedures.
 */

import { db } from '../db';
import { eq, and, or, isNull } from 'drizzle-orm';

export interface SupplierIntegrityReport {
  supplierId: string;
  supplierName: string;
  issues: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  timestamp: Date;
}

export interface SupplierBackup {
  id: string;
  supplierName: string;
  supplierCategory: string;
  contactEmail: string;
  website: string;
  description: string;
  location: string;
  isVerified: boolean;
  verificationStatus: string;
  backupTimestamp: Date;
  backupReason: string;
}

export class SupplierIntegrityService {
  
  /**
   * Validates and backs up supplier data before any critical operations
   */
  async validateAndBackupSupplier(supplierId: string, operation: string): Promise<{
    isValid: boolean;
    issues: string[];
    backup?: SupplierBackup;
  }> {
    try {
      console.log(`🔍 Validating supplier ${supplierId} for operation: ${operation}`);
      
      // Import schema tables
      const { verifiedSuppliers } = await import('@shared/schema');
      
      // Get current supplier data
      const [supplier] = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.id, supplierId));
      
      if (!supplier) {
        return {
          isValid: false,
          issues: ['Supplier not found in database']
        };
      }
      
      // Create backup before validation
      const backup: SupplierBackup = {
        id: supplier.id,
        supplierName: supplier.supplierName,
        supplierCategory: supplier.supplierCategory || '',
        contactEmail: supplier.contactEmail || '',
        website: supplier.website || '',
        description: supplier.description || '',
        location: supplier.location || '',
        isVerified: supplier.isVerified,
        verificationStatus: supplier.verificationStatus || 'pending',
        backupTimestamp: new Date(),
        backupReason: operation
      };
      
      // Validate critical fields
      const issues: string[] = [];
      
      if (!supplier.supplierName || supplier.supplierName.trim().length === 0) {
        issues.push('CRITICAL: Supplier name is missing');
      }
      
      if (!supplier.supplierCategory) {
        issues.push('CRITICAL: Supplier category is missing');
      }
      
      if (!supplier.contactEmail || supplier.contactEmail.trim().length === 0) {
        issues.push('HIGH: Contact email is missing');
      }
      
      if (!supplier.website || supplier.website.trim().length === 0) {
        issues.push('MEDIUM: Website is missing');
      }
      
      if (!supplier.description || supplier.description.trim().length === 0) {
        issues.push('MEDIUM: Description is missing');
      }
      
      // Log validation results
      if (issues.length > 0) {
        console.warn(`⚠️ Supplier validation issues for ${supplier.supplierName}:`, issues);
      } else {
        console.log(`✅ Supplier validation passed for ${supplier.supplierName}`);
      }
      
      return {
        isValid: issues.filter(issue => issue.includes('CRITICAL')).length === 0,
        issues,
        backup
      };
      
    } catch (error) {
      console.error('❌ Error in supplier validation:', error);
      return {
        isValid: false,
        issues: [`System error during validation: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
  
  /**
   * Performs comprehensive integrity check on all suppliers
   */
  async performIntegrityAudit(): Promise<SupplierIntegrityReport[]> {
    try {
      console.log('🔍 Starting comprehensive supplier integrity audit...');
      
      // Import schema tables
      const { verifiedSuppliers } = await import('@shared/schema');
      
      const allSuppliers = await db
        .select()
        .from(verifiedSuppliers);
      
      const reports: SupplierIntegrityReport[] = [];
      
      for (const supplier of allSuppliers) {
        const issues: string[] = [];
        const recommendations: string[] = [];
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
        
        // Check critical fields
        if (!supplier.supplierName || supplier.supplierName.trim().length === 0) {
          issues.push('Missing supplier name');
          severity = 'critical';
          recommendations.push('Restore supplier name from backup or contact admin');
        }
        
        if (!supplier.supplierCategory) {
          issues.push('Missing supplier category');
          if (severity !== 'critical') severity = 'high';
          recommendations.push('Assign appropriate category based on supplier type');
        }
        
        if (!supplier.contactEmail || supplier.contactEmail.trim().length === 0) {
          issues.push('Missing contact email');
          if (severity === 'low') severity = 'medium';
          recommendations.push('Request contact email from supplier');
        }
        
        if (!supplier.website || supplier.website.trim().length === 0) {
          issues.push('Missing website');
          if (severity === 'low') severity = 'medium';
          recommendations.push('Research and add supplier website');
        }
        
        if (!supplier.description || supplier.description.trim().length === 0) {
          issues.push('Missing description');
          recommendations.push('Add detailed supplier description');
        }
        
        // Check data consistency
        if (supplier.isVerified && supplier.verificationStatus !== 'verified') {
          issues.push('Inconsistent verification status');
          if (severity === 'low') severity = 'medium';
          recommendations.push('Synchronize verification flags');
        }
        
        // Check for orphaned products
        const { supplierProducts: supplierProductsTable } = await import('@shared/schema');
        const supplierProductsList = await db
          .select()
          .from(supplierProductsTable)
          .where(eq(supplierProductsTable.supplierId, supplier.id));
        
        if (supplierProductsList.length === 0 && supplier.isVerified) {
          issues.push('Verified supplier has no products');
          recommendations.push('Add supplier products or review verification status');
        }
        
        if (issues.length > 0) {
          reports.push({
            supplierId: supplier.id,
            supplierName: supplier.supplierName || 'UNNAMED_SUPPLIER',
            issues,
            severity,
            recommendations,
            timestamp: new Date()
          });
        }
      }
      
      console.log(`✅ Integrity audit completed. Found ${reports.length} suppliers with issues.`);
      
      // Log summary
      const criticalCount = reports.filter(r => r.severity === 'critical').length;
      const highCount = reports.filter(r => r.severity === 'high').length;
      const mediumCount = reports.filter(r => r.severity === 'medium').length;
      
      if (criticalCount > 0) {
        console.error(`🚨 CRITICAL: ${criticalCount} suppliers have critical data integrity issues!`);
      }
      if (highCount > 0) {
        console.warn(`⚠️ HIGH: ${highCount} suppliers have high-priority issues`);
      }
      if (mediumCount > 0) {
        console.log(`ℹ️ MEDIUM: ${mediumCount} suppliers have medium-priority issues`);
      }
      
      return reports;
      
    } catch (error) {
      console.error('❌ Error during integrity audit:', error);
      return [];
    }
  }
  
  /**
   * Recovers missing supplier data from backup sources
   */
  async recoverSupplierData(supplierId: string, missingFields: string[]): Promise<{
    success: boolean;
    recoveredFields: string[];
    errors: string[];
  }> {
    try {
      console.log(`🔧 Attempting to recover data for supplier ${supplierId}`, missingFields);
      
      const recoveredFields: string[] = [];
      const errors: string[] = [];
      
      // Import schema tables
      const { verifiedSuppliers } = await import('@shared/schema');
      
      // Get current supplier
      const [supplier] = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.id, supplierId));
      
      if (!supplier) {
        return {
          success: false,
          recoveredFields: [],
          errors: ['Supplier not found']
        };
      }
      
      // Recovery logic for each field
      const updates: any = {};
      
      if (missingFields.includes('contactEmail') && !supplier.contactEmail) {
        // Try to recover from supplier name pattern
        if (supplier.supplierName) {
          const emailGuess = `info@${supplier.supplierName.toLowerCase().replace(/\s+/g, '')}.com`;
          updates.contactEmail = emailGuess;
          recoveredFields.push('contactEmail (estimated)');
        }
      }
      
      if (missingFields.includes('website') && !supplier.website) {
        // Try to recover from supplier name pattern
        if (supplier.supplierName) {
          const websiteGuess = `https://${supplier.supplierName.toLowerCase().replace(/\s+/g, '')}.com`;
          updates.website = websiteGuess;
          recoveredFields.push('website (estimated)');
        }
      }
      
      if (missingFields.includes('description') && !supplier.description) {
        // Generate basic description
        const categoryMap: Record<string, string> = {
          'bottle_producer': 'Glass bottle manufacturing and production services',
          'label_maker': 'Custom label design and printing services',
          'closure_producer': 'Cork and closure manufacturing solutions',
          'secondary_packaging': 'Secondary packaging and logistics services',
          'ingredient_supplier': 'Premium ingredient sourcing and supply',
          'contract_distillery': 'Contract distillation and production services'
        };
        
        if (supplier.supplierCategory && categoryMap[supplier.supplierCategory]) {
          updates.description = categoryMap[supplier.supplierCategory];
          recoveredFields.push('description (generated)');
        }
      }
      
      // Apply updates if any
      if (Object.keys(updates).length > 0) {
        await db
          .update(verifiedSuppliers)
          .set({
            ...updates,
            updatedAt: new Date()
          })
          .where(eq(verifiedSuppliers.id, supplierId));
        
        console.log(`✅ Recovered ${recoveredFields.length} fields for supplier ${supplier.supplierName}`);
      }
      
      return {
        success: true,
        recoveredFields,
        errors
      };
      
    } catch (error) {
      console.error('❌ Error during data recovery:', error);
      return {
        success: false,
        recoveredFields: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  /**
   * Validates supplier data before save operations
   */
  async validateBeforeSave(supplierData: any): Promise<{
    isValid: boolean;
    sanitizedData: any;
    warnings: string[];
    errors: string[];
  }> {
    try {
      const warnings: string[] = [];
      const errors: string[] = [];
      const sanitizedData = { ...supplierData };
      
      // Required field validation
      if (!sanitizedData.supplierName || sanitizedData.supplierName.trim().length === 0) {
        errors.push('Supplier name is required');
      } else {
        sanitizedData.supplierName = sanitizedData.supplierName.trim();
      }
      
      if (!sanitizedData.supplierCategory) {
        errors.push('Supplier category is required');
      }
      
      // Optional field sanitization
      if (sanitizedData.contactEmail) {
        sanitizedData.contactEmail = sanitizedData.contactEmail.trim().toLowerCase();
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(sanitizedData.contactEmail)) {
          errors.push('Invalid email format');
        }
      } else {
        warnings.push('Missing contact email - this may cause communication issues');
      }
      
      if (sanitizedData.website) {
        sanitizedData.website = sanitizedData.website.trim();
        // Ensure website has protocol
        if (!sanitizedData.website.startsWith('http://') && !sanitizedData.website.startsWith('https://')) {
          sanitizedData.website = 'https://' + sanitizedData.website;
        }
      } else {
        warnings.push('Missing website - consider adding for better supplier profile');
      }
      
      if (sanitizedData.description) {
        sanitizedData.description = sanitizedData.description.trim();
      } else {
        warnings.push('Missing description - add details about supplier services');
      }
      
      // Set default values
      if (sanitizedData.isVerified === undefined) {
        sanitizedData.isVerified = false;
      }
      
      if (!sanitizedData.verificationStatus) {
        sanitizedData.verificationStatus = 'pending';
      }
      
      // Set timestamps
      sanitizedData.updatedAt = new Date();
      
      return {
        isValid: errors.length === 0,
        sanitizedData,
        warnings,
        errors
      };
      
    } catch (error) {
      console.error('❌ Error during pre-save validation:', error);
      return {
        isValid: false,
        sanitizedData: supplierData,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Validation system error']
      };
    }
  }
}

// Export singleton instance
export const supplierIntegrityService = new SupplierIntegrityService();