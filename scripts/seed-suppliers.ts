import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { verifiedSuppliers, supplierProducts } from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function seedSuppliers() {
  console.log('Seeding verified suppliers and products...');

  try {
    // Create bottle producers
    const [glassPack] = await db.insert(verifiedSuppliers).values({
      supplierName: 'GlassPack Solutions',
      supplierCategory: 'bottle_producer',
      website: 'https://glasspack.com',
      contactEmail: 'sales@glasspack.com',
      description: 'Premium glass bottle manufacturer specializing in spirits packaging with 30+ years experience',
      location: 'France',
      isVerified: true,
    }).returning();

    const [greenBottle] = await db.insert(verifiedSuppliers).values({
      supplierName: 'GreenBottle Co',
      supplierCategory: 'bottle_producer',
      website: 'https://greenbottle.com',
      contactEmail: 'info@greenbottle.com',
      description: 'Sustainable glass packaging solutions with high recycled content',
      location: 'Germany',
      isVerified: true,
    }).returning();

    // Create label makers
    const [premiumLabels] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Premium Labels Ltd',
      supplierCategory: 'label_maker',
      website: 'https://premiumlabels.com',
      contactEmail: 'orders@premiumlabels.com',
      description: 'High-quality paper and synthetic labels for premium beverages',
      location: 'United Kingdom',
      isVerified: true,
    }).returning();

    // Create closure producers
    const [corkTech] = await db.insert(verifiedSuppliers).values({
      supplierName: 'CorkTech Industries',
      supplierCategory: 'closure_producer',
      website: 'https://corktech.com',
      contactEmail: 'sales@corktech.com',
      description: 'Natural and synthetic cork closures for premium spirits',
      location: 'Portugal',
      isVerified: true,
    }).returning();

    console.log('✅ Suppliers created successfully');

    // Create bottle products
    await db.insert(supplierProducts).values([
      {
        supplierId: glassPack.id,
        productName: 'Premium Spirits Bottle 750ml - Antique Green',
        productDescription: 'Premium antique green glass bottle perfect for whisky and spirits. Features heavy bottom and elegant proportions.',
        sku: 'GPS-750-AG',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.824,
          water_footprint_liters: 2.1,
          energy_consumption_mj: 8.7,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Third-party LCA verified by SGS',
          verification_body: 'SGS',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material_type: 'Glass',
          weight_grams: 520,
          recycled_content_percentage: 35,
          color: 'Antique Green',
          height_mm: 315,
          diameter_mm: 84
        },
        basePrice: 1.85,
        currency: 'USD',
        minimumOrderQuantity: 2000,
        leadTimeDays: 14,
        certifications: ['ISO 9001', 'FSC Certified'],
        isVerified: true,
      },
      {
        supplierId: glassPack.id,
        productName: 'Clear Glass Bottle 500ml - Premium',
        productDescription: 'Crystal clear glass bottle with modern design, ideal for premium vodka and gin.',
        sku: 'GPS-500-CL',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.689,
          water_footprint_liters: 1.8,
          energy_consumption_mj: 7.2,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Third-party LCA verified by SGS',
          verification_body: 'SGS',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material_type: 'Glass',
          weight_grams: 450,
          recycled_content_percentage: 40,
          color: 'Clear',
          height_mm: 280,
          diameter_mm: 75
        },
        basePrice: 1.65,
        currency: 'USD',
        minimumOrderQuantity: 3000,
        leadTimeDays: 12,
        certifications: ['ISO 9001', 'FDA Approved'],
        isVerified: true,
      },
      {
        supplierId: greenBottle.id,
        productName: 'Eco-Friendly Bottle 750ml - Dark Green',
        productDescription: 'Sustainable glass bottle made from 75% recycled content. Perfect for environmentally conscious brands.',
        sku: 'GB-750-ECO',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.612,
          water_footprint_liters: 1.6,
          energy_consumption_mj: 6.8,
          calculation_method: 'PEF',
          data_source: 'Cradle-to-gate LCA by TÜV',
          verification_body: 'TÜV Rheinland',
          valid_until: '2026-06-30'
        },
        productAttributes: {
          material_type: 'Glass',
          weight_grams: 485,
          recycled_content_percentage: 75,
          color: 'Dark Green',
          height_mm: 310,
          diameter_mm: 82
        },
        basePrice: 1.95,
        currency: 'USD',
        minimumOrderQuantity: 1500,
        leadTimeDays: 16,
        certifications: ['ISO 14001', 'Cradle to Cradle Bronze'],
        isVerified: true,
      }
    ]);

    // Create label products
    await db.insert(supplierProducts).values([
      {
        supplierId: premiumLabels.id,
        productName: 'Premium Paper Label - Waterproof',
        productDescription: 'High-quality waterproof paper label with premium finish. Suitable for spirits bottles.',
        sku: 'PL-WP-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.0089,
          water_footprint_liters: 0.032,
          energy_consumption_mj: 0.124,
          calculation_method: 'ISO 14040/14044',
          data_source: 'EPD certified data',
          verification_body: 'Bureau Veritas',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material_type: 'Paper - Coated',
          weight_grams_per_sq_meter: 90,
          dimensions_mm: '100x80',
          recycled_content_percentage: 60,
          adhesive_type: 'Water-based',
          finish: 'Matte'
        },
        basePrice: 0.12,
        currency: 'USD',
        minimumOrderQuantity: 10000,
        leadTimeDays: 7,
        certifications: ['FSC Certified', 'PEFC'],
        isVerified: true,
      },
      {
        supplierId: premiumLabels.id,
        productName: 'Luxury Metallic Label',
        productDescription: 'Premium metallic finish label for luxury spirits brands. Gold/silver foil options available.',
        sku: 'PL-LUX-001',
        hasPrecalculatedLca: false,
        productAttributes: {
          material_type: 'Polyester',
          weight_grams_per_sq_meter: 120,
          dimensions_mm: '120x90',
          recycled_content_percentage: 30,
          adhesive_type: 'Hot-melt',
          finish: 'Gloss'
        },
        basePrice: 0.28,
        currency: 'USD',
        minimumOrderQuantity: 5000,
        leadTimeDays: 10,
        certifications: ['ISO 9001'],
        isVerified: true,
      }
    ]);

    // Create closure products
    await db.insert(supplierProducts).values([
      {
        supplierId: corkTech.id,
        productName: 'Natural Cork - Premium Grade',
        productDescription: 'Premium grade natural cork closures from sustainably managed forests.',
        sku: 'CT-NAT-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.0156,
          water_footprint_liters: 0.089,
          energy_consumption_mj: 0.234,
          calculation_method: 'ISO 14040/14044',
          data_source: 'FSC certified LCA study',
          verification_body: 'FSC',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material_type: 'Natural Cork',
          weight_grams: 3.8,
          diameter_mm: 24,
          length_mm: 44,
          liner_material: 'Food grade wax'
        },
        basePrice: 0.45,
        currency: 'USD',
        minimumOrderQuantity: 5000,
        leadTimeDays: 14,
        certifications: ['FSC Certified', 'FDA Approved'],
        isVerified: true,
      },
      {
        supplierId: corkTech.id,
        productName: 'Synthetic Cork - TCA Free',
        productDescription: 'TCA-free synthetic cork closure offering consistent performance and no cork taint risk.',
        sku: 'CT-SYN-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.0234,
          water_footprint_liters: 0.067,
          energy_consumption_mj: 0.189,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Internal LCA verified by third party',
          verification_body: 'Intertek',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material_type: 'Synthetic Cork',
          weight_grams: 3.2,
          diameter_mm: 24,
          length_mm: 44,
          liner_material: 'Polymer coating'
        },
        basePrice: 0.32,
        currency: 'USD',
        minimumOrderQuantity: 10000,
        leadTimeDays: 10,
        certifications: ['FDA Approved', 'ISO 9001'],
        isVerified: true,
      }
    ]);

    console.log('✅ Supplier products created successfully');
    console.log('🎉 Database seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Connection automatically closed for neon-http
  }
}

seedSuppliers().catch(console.error);