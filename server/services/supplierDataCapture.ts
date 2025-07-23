/**
 * Supplier Data Capture Service
 * Handles the three supplier data capture workflows
 */

import { db } from '../db';
import { verifiedSuppliers, supplierProducts, type InsertVerifiedSupplier, type InsertSupplierProduct } from '@shared/schema';
import { geocodingService } from './geocoding';
import { eq, and, or } from 'drizzle-orm';

export interface SupplierSubmissionData {
  supplierName: string;
  supplierCategory: string;
  website?: string;
  contactEmail?: string;
  description?: string;
  
  // Address information
  addressStreet?: string;
  addressCity?: string;
  addressPostalCode?: string;
  addressCountry?: string;
  
  // Products data
  products?: Array<{
    productName: string;
    productDescription?: string;
    sku?: string;
    productAttributes: any;
    hasPrecalculatedLca?: boolean;
    lcaDataJson?: any;
  }>;
}

export class SupplierDataCaptureService {
  
  /**
   * Workflow 1: Admin submits verified supplier data
   */
  async submitAdminSupplier(
    supplierData: SupplierSubmissionData,
    adminUserId: string
  ) {
    try {
      console.log(`🏢 Admin ${adminUserId} submitting supplier: ${supplierData.supplierName}`);
      
      // Geocode the address if provided
      let coordinates: { latitude: number; longitude: number } | null = null;
      if (supplierData.addressStreet || supplierData.addressCity) {
        coordinates = await geocodingService.geocodeAddress(
          supplierData.addressStreet,
          supplierData.addressCity,
          supplierData.addressPostalCode,
          supplierData.addressCountry
        );
      }
      
      // Create supplier record
      const supplierInsert: InsertVerifiedSupplier = {
        supplierName: supplierData.supplierName,
        supplierCategory: supplierData.supplierCategory,
        website: supplierData.website,
        contactEmail: supplierData.contactEmail,
        description: supplierData.description,
        location: supplierData.addressCountry, // Legacy field
        
        // New workflow fields
        submittedBy: 'ADMIN',
        verificationStatus: 'verified', // Admin submissions are automatically verified
        submittedByUserId: adminUserId,
        
        // Address fields
        addressStreet: supplierData.addressStreet,
        addressCity: supplierData.addressCity,
        addressPostalCode: supplierData.addressPostalCode,
        addressCountry: supplierData.addressCountry,
        
        // Coordinates
        latitude: coordinates?.latitude?.toString(),
        longitude: coordinates?.longitude?.toString(),
        geocodedAt: coordinates ? new Date() : undefined,
        
        // Legacy verification fields (for backward compatibility)
        isVerified: true,
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
      };
      
      const [supplier] = await db.insert(verifiedSuppliers).values(supplierInsert).returning();
      
      // Create supplier products if provided
      const products = [];
      if (supplierData.products && supplierData.products.length > 0) {
        for (const productData of supplierData.products) {
          const productInsert: InsertSupplierProduct = {
            supplierId: supplier.id,
            productName: productData.productName,
            productDescription: productData.productDescription,
            sku: productData.sku,
            productAttributes: productData.productAttributes || {},
            hasPrecalculatedLca: productData.hasPrecalculatedLca || false,
            lcaDataJson: productData.lcaDataJson,
            
            // Workflow fields
            submittedBy: 'ADMIN',
            submittedByUserId: adminUserId,
            
            // Auto-verify admin submissions
            isVerified: true,
            verifiedBy: adminUserId,
            verifiedAt: new Date(),
            submissionStatus: 'approved',
          };
          
          const [product] = await db.insert(supplierProducts).values(productInsert).returning();
          products.push(product);
        }
      }
      
      console.log(`✅ Admin submission successful: ${supplier.supplierName} with ${products.length} products`);
      
      return { supplier, products };
      
    } catch (error) {
      console.error('❌ Error in admin supplier submission:', error);
      throw new Error(`Failed to submit admin supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Workflow 2: Supplier submits their own data (pending review)
   */
  async submitSupplierSelfData(
    supplierData: SupplierSubmissionData,
    supplierUserId: string
  ) {
    try {
      console.log(`🏭 Supplier ${supplierUserId} self-submitting: ${supplierData.supplierName}`);
      
      // Geocode the address if provided
      let coordinates: { latitude: number; longitude: number } | null = null;
      if (supplierData.addressStreet || supplierData.addressCity) {
        coordinates = await geocodingService.geocodeAddress(
          supplierData.addressStreet,
          supplierData.addressCity,
          supplierData.addressPostalCode,
          supplierData.addressCountry
        );
      }
      
      // Create supplier record (pending review)
      const supplierInsert: InsertVerifiedSupplier = {
        supplierName: supplierData.supplierName,
        supplierCategory: supplierData.supplierCategory,
        website: supplierData.website,
        contactEmail: supplierData.contactEmail,
        description: supplierData.description,
        location: supplierData.addressCountry, // Legacy field
        
        // Workflow fields
        submittedBy: 'SUPPLIER',
        verificationStatus: 'pending_review', // Requires admin approval
        submittedByUserId: supplierUserId,
        
        // Address fields
        addressStreet: supplierData.addressStreet,
        addressCity: supplierData.addressCity,
        addressPostalCode: supplierData.addressPostalCode,
        addressCountry: supplierData.addressCountry,
        
        // Coordinates
        latitude: coordinates?.latitude?.toString(),
        longitude: coordinates?.longitude?.toString(),
        geocodedAt: coordinates ? new Date() : undefined,
        
        // Legacy fields (not verified yet)
        isVerified: false,
      };
      
      const [supplier] = await db.insert(verifiedSuppliers).values(supplierInsert).returning();
      
      // Create supplier products (also pending review)
      const products = [];
      if (supplierData.products && supplierData.products.length > 0) {
        for (const productData of supplierData.products) {
          const productInsert: InsertSupplierProduct = {
            supplierId: supplier.id,
            productName: productData.productName,
            productDescription: productData.productDescription,
            sku: productData.sku,
            productAttributes: productData.productAttributes || {},
            hasPrecalculatedLca: productData.hasPrecalculatedLca || false,
            lcaDataJson: productData.lcaDataJson,
            
            // Workflow fields
            submittedBy: 'SUPPLIER',
            submittedByUserId: supplierUserId,
            
            // Pending verification
            isVerified: false,
            submissionStatus: 'pending',
          };
          
          const [product] = await db.insert(supplierProducts).values(productInsert).returning();
          products.push(product);
        }
      }
      
      console.log(`📋 Supplier self-submission pending review: ${supplier.supplierName} with ${products.length} products`);
      
      // TODO: Send admin notification for review
      
      return { supplier, products };
      
    } catch (error) {
      console.error('❌ Error in supplier self-submission:', error);
      throw new Error(`Failed to submit supplier data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Workflow 3: Client submits supplier data for their own use
   */
  async submitClientSupplierData(
    supplierData: SupplierSubmissionData,
    clientUserId: string,
    clientCompanyId: number
  ) {
    try {
      console.log(`🏢 Client company ${clientCompanyId} submitting supplier: ${supplierData.supplierName}`);
      
      // Geocode the address if provided
      let coordinates: { latitude: number; longitude: number } | null = null;
      if (supplierData.addressStreet || supplierData.addressCity) {  
        coordinates = await geocodingService.geocodeAddress(
          supplierData.addressStreet,
          supplierData.addressCity,
          supplierData.addressPostalCode,
          supplierData.addressCountry
        );
      }
      
      // Create supplier record (client-provided, only visible to this client)
      const supplierInsert: InsertVerifiedSupplier = {
        supplierName: supplierData.supplierName,
        supplierCategory: supplierData.supplierCategory,
        website: supplierData.website,
        contactEmail: supplierData.contactEmail,
        description: supplierData.description,
        location: supplierData.addressCountry, // Legacy field
        
        // Workflow fields
        submittedBy: 'CLIENT',
        verificationStatus: 'client_provided', // Client-specific data
        submittedByUserId: clientUserId,
        submittedByCompanyId: clientCompanyId,
        
        // Address fields
        addressStreet: supplierData.addressStreet,
        addressCity: supplierData.addressCity,
        addressPostalCode: supplierData.addressPostalCode,
        addressCountry: supplierData.addressCountry,
        
        // Coordinates
        latitude: coordinates?.latitude?.toString(),
        longitude: coordinates?.longitude?.toString(),
        geocodedAt: coordinates ? new Date() : undefined,
        
        // Legacy fields (not verified in global network)
        isVerified: false,
      };
      
      const [supplier] = await db.insert(verifiedSuppliers).values(supplierInsert).returning();
      
      // Create supplier products (available immediately to this client)
      const products = [];
      if (supplierData.products && supplierData.products.length > 0) {
        for (const productData of supplierData.products) {
          const productInsert: InsertSupplierProduct = {
            supplierId: supplier.id,
            productName: productData.productName,
            productDescription: productData.productDescription,
            sku: productData.sku,
            productAttributes: productData.productAttributes || {},
            hasPrecalculatedLca: productData.hasPrecalculatedLca || false,
            lcaDataJson: productData.lcaDataJson,
            
            // Workflow fields
            submittedBy: 'CLIENT',
            submittedByUserId: clientUserId,
            submittedByCompanyId: clientCompanyId,
            
            // Immediately available to client (not globally verified)
            isVerified: false,
            submissionStatus: 'approved', // Approved for client use
          };
          
          const [product] = await db.insert(supplierProducts).values(productInsert).returning();
          products.push(product);
        }
      }
      
      console.log(`✅ Client submission successful: ${supplier.supplierName} with ${products.length} products (company ${clientCompanyId})`);
      
      // TODO: Send admin notification for potential outreach
      
      return { supplier, products };
      
    } catch (error) {
      console.error('❌ Error in client supplier submission:', error);
      throw new Error(`Failed to submit client supplier: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get suppliers visible to a specific company
   * This filters based on verification status and client-provided visibility rules
   */
  async getSuppliersForCompany(companyId: number) {
    try {
      const suppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(
          // Show verified suppliers OR client-provided suppliers for this company only
          or(
            eq(verifiedSuppliers.verificationStatus, 'verified'),
            and(
              eq(verifiedSuppliers.verificationStatus, 'client_provided'),
              eq(verifiedSuppliers.submittedByCompanyId, companyId)
            )
          )
        );
      
      return suppliers;
    } catch (error) {
      console.error('❌ Error getting suppliers for company:', error);
      throw error;
    }
  }
  
  /**
   * Get supplier products visible to a specific company
   */
  async getSupplierProductsForCompany(companyId: number, category?: string) {
    try {
      const baseCondition = or(
        eq(verifiedSuppliers.verificationStatus, 'verified'),
        and(
          eq(verifiedSuppliers.verificationStatus, 'client_provided'),
          eq(verifiedSuppliers.submittedByCompanyId, companyId)
        )
      );
      
      const conditions = category 
        ? and(baseCondition, eq(verifiedSuppliers.supplierCategory, category))
        : baseCondition;
      
      const query = db
        .select({
          id: supplierProducts.id,
          supplierId: supplierProducts.supplierId,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          productAttributes: supplierProducts.productAttributes,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          location: verifiedSuppliers.location,
        })
        .from(supplierProducts)
        .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
        .where(conditions);
      
      const products = await query;
      return products;
    } catch (error) {
      console.error('❌ Error getting supplier products for company:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const supplierDataCaptureService = new SupplierDataCaptureService();