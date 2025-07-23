import { db } from '../server/db';
import { companies, users, products, verifiedSuppliers, supplierProducts, reports } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Test data based on the End-to-End Testing Plan
export const testData = {
  company: {
    name: "Orchard Spirits Co.",
    location: "Normandy, France",
    industry: "spirits",
    country: "France",
    reportingPeriodStart: "2024-01-01",
    reportingPeriodEnd: "2024-12-31"
  },
  
  product: {
    name: "Heritage Apple Brandy",
    productType: "Spirit",
    sku: "ORC-HAB-001"
  },

  suppliers: [
    {
      supplierName: "Normandy Apple Orchards",
      supplierCategory: "agricultural_inputs",
      addressCity: "Bayeux",
      addressCountry: "France",
      verificationStatus: "verified" as const,
      submittedBy: "ADMIN" as const,
      products: [{
        productName: "Traditional Cider Apples",
        cropType: "Apples",
        yieldTonPerHa: 31.5
      }]
    },
    {
      supplierName: "Saverglass",
      supplierCategory: "bottle_producer",
      addressCity: "Feuquières",
      addressCountry: "France", 
      verificationStatus: "verified" as const,
      submittedBy: "ADMIN" as const,
      products: [{
        productName: "700ml White Glass Bottle",
        material: "Glass",
        weightG: 540,
        recycledContentPercent: 80
      }]
    },
    {
      supplierName: "Amorim Cork",
      supplierCategory: "cap_closure_producer",
      addressCity: "Porto",
      addressCountry: "Portugal",
      verificationStatus: "verified" as const,
      submittedBy: "ADMIN" as const,
      products: [{
        productName: "Natural Agglomerated Cork",
        material: "Natural Cork",
        weightG: 7.2
      }]
    },
    {
      supplierName: "Smurfit Kappa",
      supplierCategory: "packaging_supplier",
      addressCity: "Saint-Malo",
      addressCountry: "France",
      verificationStatus: "verified" as const,
      submittedBy: "ADMIN" as const,
      products: [{
        productName: "6-Bottle Corrugated Box",
        material: "Corrugated Cardboard",
        weightG: 229
      }]
    }
  ],

  lcaData: {
    agriculture: {
      dieselLPerHectare: 15
    },
    processing: {
      waterM3PerTonCrop: 0.056,
      electricityKwhPerTonCrop: 10.21,
      lpgKgPerLAlcohol: 0.16,
      netWaterUseLPerBottle: 1.23
    },
    transport: {
      mode: "Lorry >32t"
    }
  }
};

/**
 * Clean the database and reset to initial state
 */
export async function cleanDatabase() {
  console.log('🧹 Cleaning database...');
  
  // Delete in reverse dependency order
  try {
    await db.delete(reports);
    await db.delete(supplierProducts);  
    await db.delete(verifiedSuppliers);
    await db.delete(products);
    await db.delete(companies);
  } catch (error) {
    // Tables might not exist or be empty, that's ok for test setup
    console.log('Note: Some tables may not exist yet, continuing...');
  }
  
  console.log('✅ Database cleaned');
}

/**
 * Seed test user and company
 */
export async function seedTestCompany() {
  console.log('🌱 Seeding test company...');
  
  const [company] = await db.insert(companies).values({
    name: testData.company.name,
    industry: testData.company.industry,
    country: testData.company.country,
    address: testData.company.location,
    currentReportingPeriodStart: testData.company.reportingPeriodStart,
    currentReportingPeriodEnd: testData.company.reportingPeriodEnd,
    onboardingComplete: true
  }).returning();

  console.log(`✅ Created company: ${company.name} (ID: ${company.id})`);
  return company;
}

/**
 * Seed test product for the company
 */
export async function seedTestProduct(companyId: number) {
  console.log('🌱 Seeding test product...');
  
  const [product] = await db.insert(products).values({
    companyId,
    name: testData.product.name,
    sku: testData.product.sku,
    type: testData.product.productType,
    volume: "700ml",
    description: "A premium apple brandy crafted from traditional Normandy apples"
  }).returning();

  console.log(`✅ Created product: ${product.name} (ID: ${product.id})`);
  return product;
}

/**
 * Seed verified suppliers with their products
 */
export async function seedVerifiedSuppliers() {
  console.log('🌱 Seeding verified suppliers...');
  
  const supplierIds: number[] = [];
  
  for (const supplierData of testData.suppliers) {
    // Create supplier
    const [supplier] = await db.insert(verifiedSuppliers).values({
      supplierName: supplierData.supplierName,
      supplierCategory: supplierData.supplierCategory,
      addressCity: supplierData.addressCity,
      addressCountry: supplierData.addressCountry,
      verificationStatus: supplierData.verificationStatus,
      submittedBy: supplierData.submittedBy,
      // Geocoding will be handled by the service layer
      latitude: null,
      longitude: null
    }).returning();

    console.log(`✅ Created supplier: ${supplier.supplierName} (ID: ${supplier.id})`);
    supplierIds.push(supplier.id);

    // Create supplier products
    for (const productData of supplierData.products) {
      const [product] = await db.insert(supplierProducts).values({
        supplierId: supplier.id,
        productName: productData.productName,
        category: supplierData.supplierCategory
      }).returning();

      console.log(`  ✅ Created product: ${product.productName} (ID: ${product.id})`);
    }
  }
  
  return supplierIds;
}

/**
 * Complete database seeding for test environment
 */
export async function seedTestDatabase() {
  console.log('🚀 Starting complete test database seeding...');
  
  try {
    await cleanDatabase();
    const company = await seedTestCompany();
    const product = await seedTestProduct(company.id);
    const supplierIds = await seedVerifiedSuppliers();
    
    console.log('🎉 Test database seeding completed successfully!');
    console.log(`📊 Created: 1 company, 1 product, ${supplierIds.length} suppliers`);
    
    return {
      company,
      product,
      supplierIds
    };
  } catch (error) {
    console.error('❌ Test database seeding failed:', error);
    throw error;
  }
}

/**
 * Validate database state after seeding
 */
export async function validateSeedData() {
  console.log('🔍 Validating seeded data...');
  
  const [company] = await db.select().from(companies).limit(1);
  const [product] = await db.select().from(products).limit(1);
  const suppliers = await db.select().from(verifiedSuppliers);
  const supplierProductsList = await db.select().from(supplierProducts);
  
  const validation = {
    company: !!company,
    product: !!product,
    suppliers: suppliers.length === testData.suppliers.length,
    supplierProducts: supplierProductsList.length === testData.suppliers.length,
    allVerified: suppliers.every(s => s.verificationStatus === 'verified')
  };
  
  console.log('📋 Validation results:', validation);
  
  if (Object.values(validation).every(v => v)) {
    console.log('✅ All validation checks passed');
    return true;
  } else {
    console.log('❌ Some validation checks failed');
    return false;
  }
}

// Export test runner function
export async function runTestSeeding() {
  const seededData = await seedTestDatabase();
  const isValid = await validateSeedData();
  
  if (!isValid) {
    throw new Error('Test data validation failed');
  }
  
  return seededData;
}