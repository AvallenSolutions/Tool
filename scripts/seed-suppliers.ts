#!/usr/bin/env tsx

import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Verified suppliers seed data
const verifiedSuppliersData = [
  // Ingredient Suppliers
  {
    supplierName: "Highland Grain Co.",
    supplierCategory: "ingredient_supplier",
    website: "https://highlandgrain.co.uk",
    contactEmail: "supply@highlandgrain.co.uk",
    location: "Scotland, UK",
    description: "Premium organic grains and malts for craft distilling",
    isVerified: true,
  },
  {
    supplierName: "Celtic Botanicals",
    supplierCategory: "ingredient_supplier", 
    website: "https://celticbotanicals.ie",
    contactEmail: "info@celticbotanicals.ie",
    location: "Ireland",
    description: "Certified organic botanicals and herbs for premium spirits",
    isVerified: true,
  },
  // Packaging Suppliers  
  {
    supplierName: "Ardagh Glass UK",
    supplierCategory: "bottle_producer",
    website: "https://ardaghgroup.com",
    contactEmail: "sales@ardaghglass.com",
    location: "United Kingdom",
    description: "Premium glass bottles for spirits with sustainability focus",
    isVerified: true,
  },
  {
    supplierName: "Crown Cork & Seal",
    supplierCategory: "closure_producer",
    website: "https://crowncork.com", 
    contactEmail: "spirits@crowncork.com",
    location: "USA",
    description: "Premium closures including natural cork and synthetic alternatives",
    isVerified: true,
  },
  {
    supplierName: "Multi-Color Corporation",
    supplierCategory: "label_maker",
    website: "https://multicolor.com",
    contactEmail: "labels@multicolor.com", 
    location: "USA",
    description: "Sustainable labeling solutions with recyclable materials",
    isVerified: true,
  }
];

// Supplier products seed data
const supplierProductsData = [
  // Highland Grain Co. Products
  {
    supplierName: "Highland Grain Co.",
    productName: "Organic Malted Barley",
    productDescription: "Premium 2-row malted barley, organic certified, ideal for whisky production",
    sku: "HGC-OMB-001",
    hasPrecalculatedLca: true,
    lcaDataJson: {
      carbonFootprint: 0.45, // kg CO2e per kg
      waterFootprint: 2.1, // L per kg
      landUse: 1.8 // m2 per kg
    },
    productAttributes: {
      ingredient_type: "grain",
      origin_country: "Scotland",
      organic_certified: true,
      typical_usage_per_unit: 2.5,
      usage_unit: "kg"
    },
    basePrice: 1.85,
    currency: "GBP",
    minimumOrderQuantity: 1000,
    leadTimeDays: 14,
    certifications: ["organic", "fair-trade"],
    isVerified: true
  },
  {
    supplierName: "Celtic Botanicals", 
    productName: "Juniper Berries - Premium Grade",
    productDescription: "Wild-harvested juniper berries from sustainable sources",
    sku: "CB-JUN-001",
    hasPrecalculatedLca: true,
    lcaDataJson: {
      carbonFootprint: 1.2, // kg CO2e per kg
      waterFootprint: 0.8, // L per kg  
      landUse: 0.1 // m2 per kg
    },
    productAttributes: {
      ingredient_type: "botanical",
      origin_country: "Ireland", 
      organic_certified: true,
      typical_usage_per_unit: 0.05,
      usage_unit: "kg"
    },
    basePrice: 24.50,
    currency: "EUR",
    minimumOrderQuantity: 25,
    leadTimeDays: 7,
    certifications: ["organic", "sustainable-sourcing"],
    isVerified: true
  },
  // Ardagh Glass Products
  {
    supplierName: "Ardagh Glass UK",
    productName: "Premium Spirit Bottle - 700ml",
    productDescription: "Antique green glass bottle, premium weight, suitable for whisky and gin",
    sku: "AG-PSB-700",
    hasPrecalculatedLca: true,
    lcaDataJson: {
      carbonFootprint: 0.82, // kg CO2e per bottle
      waterFootprint: 0.15, // L per bottle
      materialComposition: { glass: 95, labels: 5 }
    },
    productAttributes: {
      material_type: "Glass",
      color: "Antique Green", 
      volume_ml: 700,
      weight_grams: 485,
      recycled_content_percent: 35
    },
    basePrice: 0.65,
    currency: "GBP", 
    minimumOrderQuantity: 5000,
    leadTimeDays: 21,
    certifications: ["recyclable", "sustainable-packaging"],
    isVerified: true
  },
  // Crown Cork Products
  {
    supplierName: "Crown Cork & Seal",
    productName: "Natural Cork Closure - Premium",
    productDescription: "Natural cork closure with premium coating, ideal for spirits",
    sku: "CC-NC-001",
    hasPrecalculatedLca: true,
    lcaDataJson: {
      carbonFootprint: 0.025, // kg CO2e per closure
      waterFootprint: 0.002, // L per closure
      biodegradable: true
    },
    productAttributes: {
      material_type: "Natural Cork",
      diameter_mm: 18.5,
      length_mm: 45,
      weight_grams: 4.2
    },
    basePrice: 0.18,
    currency: "USD",
    minimumOrderQuantity: 10000, 
    leadTimeDays: 28,
    certifications: ["sustainable-forestry", "biodegradable"],
    isVerified: true
  },
  // Multi-Color Labels
  {
    supplierName: "Multi-Color Corporation",
    productName: "Recycled Paper Label - Premium",
    productDescription: "High-quality recycled paper label with eco-friendly adhesive",
    sku: "MC-RPL-001", 
    hasPrecalculatedLca: true,
    lcaDataJson: {
      carbonFootprint: 0.012, // kg CO2e per label
      waterFootprint: 0.08, // L per label
      recyclable: true
    },
    productAttributes: {
      material_type: "Recycled Paper",
      dimensions: "80x120mm",
      weight_grams: 2.1,
      recycled_content_percent: 85
    },
    basePrice: 0.045,
    currency: "USD",
    minimumOrderQuantity: 50000,
    leadTimeDays: 14,
    certifications: ["recyclable", "sustainable-packaging"],
    isVerified: true
  }
];

async function seedSuppliers() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Starting supplier seeding process...');
    
    // First, insert verified suppliers
    console.log('📦 Inserting verified suppliers...');
    
    for (const supplier of verifiedSuppliersData) {
      const result = await client.query(`
        INSERT INTO verified_suppliers (
          supplier_name, supplier_category, website, contact_email, 
          location, description, is_verified, verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (supplier_name) DO UPDATE SET
          supplier_category = EXCLUDED.supplier_category,
          website = EXCLUDED.website,
          contact_email = EXCLUDED.contact_email,
          location = EXCLUDED.location,
          description = EXCLUDED.description,
          is_verified = EXCLUDED.is_verified
        RETURNING id;
      `, [
        supplier.supplierName,
        supplier.supplierCategory, 
        supplier.website,
        supplier.contactEmail,
        supplier.location,
        supplier.description,
        supplier.isVerified
      ]);
      
      console.log(`✅ Inserted supplier: ${supplier.supplierName}`);
    }
    
    // Then, insert supplier products
    console.log('📋 Inserting supplier products...');
    
    for (const product of supplierProductsData) {
      // Get supplier ID
      const supplierResult = await client.query(
        'SELECT id FROM verified_suppliers WHERE supplier_name = $1',
        [product.supplierName]
      );
      
      if (supplierResult.rows.length === 0) {
        console.warn(`⚠️  Supplier not found: ${product.supplierName}`);
        continue;
      }
      
      const supplierId = supplierResult.rows[0].id;
      
      await client.query(`
        INSERT INTO supplier_products (
          supplier_id, product_name, product_description, sku,
          has_precalculated_lca, lca_data_json, product_attributes,
          base_price, currency, minimum_order_quantity, lead_time_days,
          certifications, is_verified, verified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
        ON CONFLICT (sku) DO UPDATE SET
          product_name = EXCLUDED.product_name,
          product_description = EXCLUDED.product_description,
          has_precalculated_lca = EXCLUDED.has_precalculated_lca,
          lca_data_json = EXCLUDED.lca_data_json,
          product_attributes = EXCLUDED.product_attributes,
          base_price = EXCLUDED.base_price,
          currency = EXCLUDED.currency,
          minimum_order_quantity = EXCLUDED.minimum_order_quantity,
          lead_time_days = EXCLUDED.lead_time_days,
          certifications = EXCLUDED.certifications,
          is_verified = EXCLUDED.is_verified;
      `, [
        supplierId,
        product.productName,
        product.productDescription,
        product.sku,
        product.hasPrecalculatedLca,
        JSON.stringify(product.lcaDataJson),
        JSON.stringify(product.productAttributes),
        product.basePrice,
        product.currency,
        product.minimumOrderQuantity,
        product.leadTimeDays,
        product.certifications,
        product.isVerified
      ]);
      
      console.log(`✅ Inserted product: ${product.productName}`);
    }
    
    console.log('🎉 Supplier seeding completed successfully!');
    
    // Show summary
    const supplierCount = await client.query('SELECT COUNT(*) FROM verified_suppliers');
    const productCount = await client.query('SELECT COUNT(*) FROM supplier_products');
    
    console.log(`📊 Summary:`);
    console.log(`   - Verified suppliers: ${supplierCount.rows[0].count}`);
    console.log(`   - Supplier products: ${productCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding suppliers:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the seeding
if (import.meta.main) {
  seedSuppliers().catch(console.error);
}