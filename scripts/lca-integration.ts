import { db } from '../server/db';
import { products, productInputs, supplierProducts, verifiedSuppliers, reports } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Create supplier-product linkages and generate LCA reports
 */
export async function createSupplierProductLinks() {
  console.log('🔗 Creating supplier-product linkages...');
  
  try {
    // Get the test products
    const productsList = await db.select().from(products);
    console.log(`Found ${productsList.length} products to link`);
    
    // Get the test suppliers
    const suppliers = await db.select().from(verifiedSuppliers);
    const supplierProductsList = await db.select().from(supplierProducts);
    
    console.log(`Found ${suppliers.length} suppliers with ${supplierProductsList.length} products`);
    
    const linkages = [];
    
    for (const product of productsList) {
      console.log(`\n🔗 Linking suppliers to product: ${product.name}`);
      
      // Link each supplier category to the product
      for (const supplier of suppliers) {
        const supplierProduct = supplierProductsList.find(sp => sp.supplierId === supplier.id);
        
        if (supplierProduct) {
          const [linkage] = await db.insert(productInputs).values({
            productId: product.id,
            supplierId: supplier.id,
            supplierProductId: supplierProduct.id,
            inputType: supplier.supplierCategory,
            quantity: 1, // Default quantity
            unit: 'unit',
            costPerUnit: 0 // Mock cost
          }).returning();
          
          linkages.push(linkage);
          console.log(`  ✅ Linked ${supplier.supplierName} (${supplier.supplierCategory}) to ${product.name}`);
        }
      }
    }
    
    console.log(`\n🎉 Created ${linkages.length} supplier-product linkages`);
    return linkages;
    
  } catch (error) {
    console.error('❌ Failed to create supplier-product linkages:', error);
    throw error;
  }
}

/**
 * Generate mock LCA reports for products
 */
export async function generateLCAReports() {
  console.log('📊 Generating LCA reports...');
  
  try {
    const productsList = await db.select().from(products);
    const generatedReports = [];
    
    for (const product of productsList) {
      // Mock LCA calculation results
      const mockLCAData = {
        carbon: {
          total: Math.round((Math.random() * 3 + 1.5) * 100) / 100, // 1.5-4.5 kg CO2e
          breakdown: {
            agriculture: Math.round((Math.random() * 1.5 + 0.5) * 100) / 100,
            processing: Math.round((Math.random() * 1.2 + 0.3) * 100) / 100,
            packaging: Math.round((Math.random() * 0.8 + 0.2) * 100) / 100,
            transport: Math.round((Math.random() * 0.5 + 0.1) * 100) / 100
          }
        },
        water: {
          total: Math.round((Math.random() * 100 + 50) * 10) / 10, // 50-150 liters
          breakdown: {
            agriculture: Math.round((Math.random() * 80 + 30) * 10) / 10,
            processing: Math.round((Math.random() * 40 + 10) * 10) / 10
          }
        },
        waste: {
          total: Math.round((Math.random() * 1.5 + 0.3) * 100) / 100, // 0.3-1.8 kg
          breakdown: {
            packaging: Math.round((Math.random() * 1.2 + 0.2) * 100) / 100,
            processing: Math.round((Math.random() * 0.5 + 0.1) * 100) / 100
          }
        }
      };
      
      const [report] = await db.insert(reports).values({
        companyId: product.companyId,
        productId: product.id,
        title: `LCA Report - ${product.name}`,
        status: 'completed',
        reportType: 'lca',
        totalCarbonFootprint: mockLCAData.carbon.total,
        totalWaterUsage: mockLCAData.water.total,
        totalWasteGenerated: mockLCAData.waste.total,
        reportData: mockLCAData
      }).returning();
      
      generatedReports.push(report);
      console.log(`✅ Generated LCA report for ${product.name}: ${mockLCAData.carbon.total} kg CO2e`);
    }
    
    console.log(`\n🎉 Generated ${generatedReports.length} LCA reports`);
    return generatedReports;
    
  } catch (error) {
    console.error('❌ Failed to generate LCA reports:', error);
    throw error;
  }
}

/**
 * Complete integration: link suppliers and generate LCA reports
 */
export async function completeIntegrationTest() {
  console.log('🚀 Starting complete integration test...');
  
  try {
    const linkages = await createSupplierProductLinks();
    const reports = await generateLCAReports();
    
    console.log('\n📋 Integration Test Summary:');
    console.log(`✅ Supplier linkages: ${linkages.length}`);
    console.log(`✅ LCA reports: ${reports.length}`);
    
    return {
      linkages,
      reports,
      success: true
    };
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validate the complete test setup
 */
export async function validateCompleteSetup() {
  console.log('🔍 Validating complete test setup...');
  
  try {
    const companies = await db.select().from(products);
    const productsList = await db.select().from(products);
    const suppliers = await db.select().from(verifiedSuppliers);
    const linkages = await db.select().from(productInputs);
    const reportsList = await db.select().from(reports);
    
    const validation = {
      companies: companies.length >= 1,
      products: productsList.length >= 2,
      suppliers: suppliers.length >= 4,
      linkages: linkages.length >= 8, // 2 products × 4 suppliers
      reports: reportsList.length >= 2
    };
    
    console.log('📊 Final Validation Results:');
    console.log(`Companies: ${companies.length}/1 ✓`);
    console.log(`Products: ${productsList.length}/2 ${productsList.length >= 2 ? '✓' : '✗'}`);
    console.log(`Suppliers: ${suppliers.length}/4 ${suppliers.length >= 4 ? '✓' : '✗'}`);
    console.log(`Linkages: ${linkages.length}/8 ${linkages.length >= 8 ? '✓' : '✗'}`);
    console.log(`Reports: ${reportsList.length}/2 ${reportsList.length >= 2 ? '✓' : '✗'}`);
    
    const success = Object.values(validation).every(v => v);
    console.log(success ? '\n🎉 All validation checks passed!' : '\n❌ Some validation checks failed');
    
    return {
      validation,
      success,
      counts: {
        companies: companies.length,
        products: productsList.length,
        suppliers: suppliers.length,
        linkages: linkages.length,
        reports: reportsList.length
      }
    };
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return { success: false, error: error.message };
  }
}