import { db } from '../db';
import { verifiedSuppliers, supplierProducts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { ExtractedSupplierData, ExtractedProductData } from './WebScrapingService';

export interface SupplierProductCreationData {
  supplierData: ExtractedSupplierData;
  productData: ExtractedProductData;
  selectedImages?: string[];
}

export class SupplierProductService {
  
  /**
   * Create or update supplier and link product
   * Handles supplier deduplication based on company name and website
   */
  static async createSupplierProduct(data: SupplierProductCreationData): Promise<{
    supplierId: string;
    productId: string;
    isNewSupplier: boolean;
  }> {
    const { supplierData, productData, selectedImages } = data;
    
    console.log('🏭 SupplierProductService.createSupplierProduct called with:');
    console.log('supplierData:', JSON.stringify(supplierData, null, 2));
    console.log('productData:', JSON.stringify(productData, null, 2));
    console.log('selectedImages:', selectedImages);

    // Step 1: Find or create supplier
    let supplier = null;
    let isNewSupplier = false;

    // Search for existing supplier by company name or website
    if (supplierData.companyName) {
      const existingSuppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.supplierName, supplierData.companyName))
        .limit(1);
      
      supplier = existingSuppliers[0] || null;
    }

    // If not found by name, try by website
    if (!supplier && supplierData.website) {
      const existingSuppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.website, supplierData.website))
        .limit(1);
        
      supplier = existingSuppliers[0] || null;
    }

    // Create new supplier if none found
    if (!supplier) {
      const newSupplierData = {
        supplierName: supplierData.companyName || 'Unknown Supplier',
        supplierCategory: this.mapSupplierType(supplierData.supplierType || supplierData.type),
        website: supplierData.website,
        contactEmail: supplierData.email || supplierData.contactEmail,
        description: supplierData.description,
        location: this.extractLocationFromAddress(supplierData.address),
        submittedBy: 'CLIENT' as const,
        verificationStatus: 'client_provided' as const,
        submittedByUserId: null, // Could be set from session
        submittedByCompanyId: null // Could be set from session
      };

      const [createdSupplier] = await db
        .insert(verifiedSuppliers)
        .values(newSupplierData)
        .returning();
      
      supplier = createdSupplier;
      isNewSupplier = true;
    }

    // Step 2: Create supplier product
    // Handle both old and new field name formats
    const productCreationData = {
      supplierId: supplier.id,
      productName: productData.productName || productData.name || 'Unnamed Product',
      description: productData.description,
      materialType: productData.materialType || productData.material,
      weight: productData.weight,
      weightUnit: productData.weightUnit,
      capacity: productData.capacity,
      capacityUnit: productData.capacityUnit,
      height: productData.dimensions?.height,
      width: productData.dimensions?.width,
      depth: productData.dimensions?.depth,
      dimensionUnit: productData.dimensions?.unit,
      recycledContent: productData.recycledContent,
      color: productData.color,
      sku: productData.sku,
      unitPrice: productData.price,
      currency: productData.currency,
      certifications: productData.certifications || [],
      imageUrls: selectedImages || productData.photos || productData.additionalImages || [],
      hasPrecalculatedLca: false
    };

    const [createdProduct] = await db
      .insert(supplierProducts)
      .values(productCreationData)
      .returning();

    return {
      supplierId: supplier.id,
      productId: createdProduct.id,
      isNewSupplier
    };
  }

  /**
   * Map supplier type from extracted data to database categories
   */
  private static mapSupplierType(supplierType?: string): string {
    if (!supplierType) return 'general_supplier';
    
    const typeMap: Record<string, string> = {
      'Bottle Producer': 'bottle_producer',
      'Label Maker': 'label_maker', 
      'Closure Producer': 'closure_producer',
      'Packaging Supplier': 'secondary_packaging',
      'Ingredient Supplier': 'ingredient_supplier',
      'Contract Manufacturer': 'contract_distillery',
      'General Supplier': 'general_supplier'
    };

    return typeMap[supplierType] || 'general_supplier';
  }

  /**
   * Extract location/country from address string
   */
  private static extractLocationFromAddress(address?: string): string | null {
    if (!address) return null;
    
    // Simple extraction - look for common country patterns at end of address
    const countryPatterns = [
      /,\s*(USA|United States|US)$/i,
      /,\s*(UK|United Kingdom|Britain)$/i,
      /,\s*(Canada|CA)$/i,
      /,\s*(Germany|Deutschland|DE)$/i,
      /,\s*(France|FR)$/i,
      /,\s*(Italy|IT)$/i,
      /,\s*([A-Z]{2,3})$/i // Generic 2-3 letter country codes
    ];

    for (const pattern of countryPatterns) {
      const match = address.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Get all products for a supplier
   */
  static async getSupplierProducts(supplierId: string) {
    return await db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.supplierId, supplierId));
  }

  /**
   * Check if supplier exists by name or website
   */
  static async findExistingSupplier(companyName?: string, website?: string) {
    if (companyName) {
      const byName = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.supplierName, companyName))
        .limit(1);
      
      if (byName[0]) return byName[0];
    }

    if (website) {
      const byWebsite = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.website, website))
        .limit(1);
        
      if (byWebsite[0]) return byWebsite[0];
    }

    return null;
  }
}