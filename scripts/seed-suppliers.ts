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

    // Create ingredient suppliers
    const [scotlandGrain] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Scotland Grain Co',
      supplierCategory: 'ingredient_supplier',
      website: 'https://scotlandgrain.com',
      contactEmail: 'supply@scotlandgrain.com',
      description: 'Premium Scottish malted barley and grains for whisky production',
      location: 'Scotland',
      isVerified: true,
    }).returning();

    const [organicBotanicals] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Organic Botanicals Ltd',
      supplierCategory: 'ingredient_supplier',
      website: 'https://organicbotanicals.com',
      contactEmail: 'orders@organicbotanicals.com',
      description: 'Certified organic botanicals and herbs for gin and spirit production',
      location: 'Netherlands',
      isVerified: true,
    }).returning();

    const [purisWater] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Puris Water Systems',
      supplierCategory: 'ingredient_supplier',
      website: 'https://puriswater.com',
      contactEmail: 'info@puriswater.com',
      description: 'Premium water treatment and purification systems for beverage production',
      location: 'Switzerland',
      isVerified: true,
    }).returning();

    // Additional packaging suppliers
    const [alpineGlass] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Alpine Glass Works',
      supplierCategory: 'bottle_producer',
      website: 'https://alpineglass.com',
      contactEmail: 'orders@alpineglass.com',
      description: 'Artisan glass bottles for premium spirits with custom design capabilities',
      location: 'Austria',
      isVerified: true,
    }).returning();

    const [vintageCork] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Vintage Cork Company',
      supplierCategory: 'closure_producer',
      website: 'https://vintagecork.com',
      contactEmail: 'sales@vintagecork.com',
      description: 'Traditional cork closures and modern synthetic alternatives',
      location: 'Spain',
      isVerified: true,
    }).returning();

    const [premiumLabelCo] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Premium Label Co',
      supplierCategory: 'label_maker',
      website: 'https://premiumlabels.com',
      contactEmail: 'design@premiumlabels.com',
      description: 'High-quality labels with sustainable materials and custom printing',
      location: 'Germany',
      isVerified: true,
    }).returning();

    // Additional ingredient suppliers
    const [frenchGrains] = await db.insert(verifiedSuppliers).values({
      supplierName: 'French Grain House',
      supplierCategory: 'ingredient_supplier',
      website: 'https://frenchgrains.fr',
      contactEmail: 'export@frenchgrains.fr',
      description: 'Premium French wheat and corn for luxury spirit production',
      location: 'France',
      isVerified: true,
    }).returning();

    const [mountainSpices] = await db.insert(verifiedSuppliers).values({
      supplierName: 'Mountain Spice Traders',
      supplierCategory: 'ingredient_supplier',
      website: 'https://mountainspices.com',
      contactEmail: 'sourcing@mountainspices.com',
      description: 'Ethically sourced spices and botanicals from mountain regions',
      location: 'Nepal',
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
        supplierId: premiumLabelCo.id,
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
        supplierId: premiumLabelCo.id,
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

    // Create ingredient products
    await db.insert(supplierProducts).values([
      {
        supplierId: scotlandGrain.id,
        productName: 'Premium Malted Barley - Scottish Highlands',
        productDescription: 'Premium 2-row malted barley from Scottish Highlands farms. Consistent quality and flavor profile perfect for single malt whisky production.',
        sku: 'SGC-MALT-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.89,
          water_footprint_liters: 1200,
          energy_consumption_mj: 3.2,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Farm-to-gate LCA by independent assessor',
          verification_body: 'Carbon Trust',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Grain',
          variety: 'Two-row Barley',
          origin_country: 'Scotland',
          organic_certified: false,
          moisture_content_percentage: 4.5,
          protein_content_percentage: 10.8,
          typical_usage_per_unit: 2.5,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 1.20,
        currency: 'USD',
        minimumOrderQuantity: 1000,
        leadTimeDays: 7,
        certifications: ['Red Tractor Assured', 'HACCP'],
        isVerified: true,
      },
      {
        supplierId: scotlandGrain.id,
        productName: 'Organic Scottish Oats - Premium Grade',
        productDescription: 'Certified organic Scottish oats, perfect for adding texture and flavor to grain-forward spirits.',
        sku: 'SGC-OATS-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.76,
          water_footprint_liters: 1050,
          energy_consumption_mj: 2.8,
          calculation_method: 'PEF',
          data_source: 'Organic farm LCA study',
          verification_body: 'Soil Association',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Grain',
          variety: 'Scottish Oats',
          origin_country: 'Scotland',
          organic_certified: true,
          moisture_content_percentage: 12.0,
          protein_content_percentage: 16.9,
          typical_usage_per_unit: 0.5,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 1.85,
        currency: 'USD',
        minimumOrderQuantity: 500,
        leadTimeDays: 10,
        certifications: ['Organic Certified', 'Soil Association'],
        isVerified: true,
      },
      {
        supplierId: organicBotanicals.id,
        productName: 'Organic Juniper Berries - Premium',
        productDescription: 'Premium organic juniper berries from sustainable farms. Essential for gin production with intense aromatic profile.',
        sku: 'OB-JUN-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 2.34,
          water_footprint_liters: 890,
          energy_consumption_mj: 4.1,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Botanical ingredient LCA database',
          verification_body: 'EcoCert',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Botanical',
          variety: 'Juniperus communis',
          origin_country: 'Italy',
          organic_certified: true,
          moisture_content_percentage: 8.0,
          essential_oil_content_percentage: 2.8,
          typical_usage_per_unit: 0.015,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 28.50,
        currency: 'USD',
        minimumOrderQuantity: 25,
        leadTimeDays: 14,
        certifications: ['EU Organic', 'Fair Trade'],
        isVerified: true,
      },
      {
        supplierId: organicBotanicals.id,
        productName: 'Organic Coriander Seeds',
        productDescription: 'Premium organic coriander seeds with bright, citrusy notes. Perfect for gin and herbal spirits.',
        sku: 'OB-COR-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 1.89,
          water_footprint_liters: 750,
          energy_consumption_mj: 3.5,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Spice trade LCA study',
          verification_body: 'EcoCert',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Botanical',
          variety: 'Coriandrum sativum',
          origin_country: 'Morocco',
          organic_certified: true,
          moisture_content_percentage: 9.5,
          essential_oil_content_percentage: 1.2,
          typical_usage_per_unit: 0.008,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 12.50,
        currency: 'USD',
        minimumOrderQuantity: 50,
        leadTimeDays: 12,
        certifications: ['EU Organic', 'Rainforest Alliance'],
        isVerified: true,
      },
      {
        supplierId: purisWater.id,
        productName: 'Purified Production Water - Premium Grade',
        productDescription: 'Ultra-pure water system for spirit production. Removes all impurities while maintaining optimal mineral content.',
        sku: 'PWS-PURE-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.0012,
          water_footprint_liters: 1.0,
          energy_consumption_mj: 0.0089,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Water treatment LCA study',
          verification_body: 'Water Quality Association',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Water',
          ph_level: 7.2,
          total_dissolved_solids_ppm: 50,
          origin_country: 'Local Source',
          organic_certified: false,
          mineral_content: 'Optimal for spirits',
          typical_usage_per_unit: 3.5,
          usage_unit: 'L',
          treatment_method: 'Reverse Osmosis + UV'
        },
        basePrice: 0.15,
        currency: 'USD',
        minimumOrderQuantity: 1000,
        leadTimeDays: 3,
        certifications: ['NSF Certified', 'FDA Approved'],
        isVerified: true,
      },
      
      // Additional packaging products
      {
        supplierId: alpineGlass.id,
        productName: 'Artisan 750ml Flint Glass Bottle',
        productDescription: 'Hand-crafted flint glass bottle with unique texture. Perfect for premium gin and vodka brands seeking distinctive packaging.',
        sku: 'AGW-750-ART',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.89,
          water_footprint_liters: 2.8,
          energy_consumption_mj: 12.4,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Glass industry LCA database',
          verification_body: 'SGS',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          capacity_ml: 750,
          material: 'Flint Glass',
          weight_g: 520,
          neck_finish: '28mm ROPP',
          color: 'Clear',
          shape: 'Artisan Textured',
          origin_country: 'Austria'
        },
        basePrice: 1.85,
        currency: 'EUR',
        minimumOrderQuantity: 5000,
        leadTimeDays: 21,
        certifications: ['ISO 9001', 'BRC Packaging'],
        isVerified: true,
      },
      {
        supplierId: vintageCork.id,
        productName: 'Premium Synthetic Cork - T-Top',
        productDescription: 'High-performance synthetic cork with excellent seal properties. Consistent quality and no cork taint risk.',
        sku: 'VCC-SYN-TTOP',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.012,
          water_footprint_liters: 0.08,
          energy_consumption_mj: 0.34,
          calculation_method: 'PEF',
          data_source: 'Polymer industry LCA',
          verification_body: 'TÜV SÜD',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          length_mm: 44,
          diameter_mm: 24,
          material: 'TPE Polymer',
          compression_force_n: 125,
          extraction_force_n: 180,
          color: 'Natural Cork',
          surface_treatment: 'Smooth'
        },
        basePrice: 0.28,
        currency: 'EUR',
        minimumOrderQuantity: 10000,
        leadTimeDays: 14,
        certifications: ['FDA Approved', 'EU Food Contact'],
        isVerified: true,
      },
      {
        supplierId: premiumLabelCo.id,
        productName: 'Waterproof Polymer Label - Premium',
        productDescription: 'Durable waterproof labels with high-quality printing. Resistant to condensation and handling.',
        sku: 'PLC-POLY-PREM',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.045,
          water_footprint_liters: 0.12,
          energy_consumption_mj: 0.89,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Label industry study',
          verification_body: 'ISEGA',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          material: 'BOPP Film',
          thickness_microns: 60,
          adhesive_type: 'Permanent Acrylic',
          print_quality: 'HD Digital',
          finish: 'Gloss',
          size_mm: '90x120',
          colors_available: 8
        },
        basePrice: 0.15,
        currency: 'EUR',
        minimumOrderQuantity: 5000,
        leadTimeDays: 10,
        certifications: ['FSC Certified', 'Cradle to Cradle'],
        isVerified: true,
      },

      // Additional ingredient products
      {
        supplierId: frenchGrains.id,
        productName: 'Premium French Wheat - Milling Grade',
        productDescription: 'High-protein French wheat ideal for grain spirits and vodka production. Consistent starch content and excellent fermentation properties.',
        sku: 'FGH-WHEAT-001',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.72,
          water_footprint_liters: 1180,
          energy_consumption_mj: 2.9,
          calculation_method: 'ISO 14040/14044',
          data_source: 'French agriculture LCA',
          verification_body: 'ADEME',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Grain',
          variety: 'French Wheat',
          protein_content_percentage: 12.5,
          moisture_content_percentage: 13.0,
          origin_country: 'France',
          organic_certified: false,
          typical_usage_per_unit: 3.2,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 0.95,
        currency: 'EUR',
        minimumOrderQuantity: 2000,
        leadTimeDays: 5,
        certifications: ['Label Rouge', 'HACCP'],
        isVerified: true,
      },
      {
        supplierId: frenchGrains.id,
        productName: 'Organic French Corn - Non-GMO',
        productDescription: 'Certified organic French corn for bourbon and whiskey production. Sweet variety with high starch conversion rate.',
        sku: 'FGH-CORN-ORG',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.68,
          water_footprint_liters: 900,
          energy_consumption_mj: 2.1,
          calculation_method: 'PEF',
          data_source: 'Organic farming LCA study',
          verification_body: 'Ecocert',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Grain',
          variety: 'French Sweet Corn',
          protein_content_percentage: 8.9,
          moisture_content_percentage: 14.0,
          origin_country: 'France',
          organic_certified: true,
          typical_usage_per_unit: 2.8,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 1.35,
        currency: 'EUR',
        minimumOrderQuantity: 1000,
        leadTimeDays: 8,
        certifications: ['EU Organic', 'Non-GMO Project'],
        isVerified: true,
      },
      {
        supplierId: mountainSpices.id,
        productName: 'Wild Himalayan Cardamom Pods',
        productDescription: 'Premium green cardamom pods from high-altitude Himalayan farms. Intense aroma perfect for gin botanicals.',
        sku: 'MST-CARD-HIM',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 3.2,
          water_footprint_liters: 2400,
          energy_consumption_mj: 5.8,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Spice trade carbon study',
          verification_body: 'Rainforest Alliance',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Botanical',
          variety: 'Green Cardamom',
          essential_oil_content_percentage: 7.2,
          moisture_content_percentage: 10.0,
          origin_country: 'Nepal',
          organic_certified: true,
          typical_usage_per_unit: 0.003,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 85.50,
        currency: 'USD',
        minimumOrderQuantity: 10,
        leadTimeDays: 20,
        certifications: ['Fair Trade', 'Organic Certified'],
        isVerified: true,
      },
      {
        supplierId: mountainSpices.id,
        productName: 'Alpine Juniper Berries - Wild Harvested',
        productDescription: 'Wild-harvested juniper berries from Alpine regions. Distinctive piney flavor with citrus notes for premium gin production.',
        sku: 'MST-JUN-ALP',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 1.89,
          water_footprint_liters: 680,
          energy_consumption_mj: 3.4,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Wild harvest sustainability study',
          verification_body: 'IFOAM',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Botanical',
          variety: 'Wild Alpine Juniper',
          essential_oil_content_percentage: 3.1,
          moisture_content_percentage: 9.5,
          origin_country: 'Austria',
          organic_certified: true,
          typical_usage_per_unit: 0.012,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 32.80,
        currency: 'EUR',
        minimumOrderQuantity: 20,
        leadTimeDays: 18,
        certifications: ['Wild Harvest Certified', 'EU Organic'],
        isVerified: true,
      },
      {
        supplierId: scotlandGrain.id,
        productName: 'Highland Rye - Heritage Variety',
        productDescription: 'Heritage Scottish rye variety with complex flavor profile. Perfect for rye whiskey and experimental grain bills.',
        sku: 'SGC-RYE-HER',
        hasPrecalculatedLca: true,
        lcaDataJson: {
          carbon_footprint_kg_co2_eq: 0.94,
          water_footprint_liters: 1350,
          energy_consumption_mj: 3.6,
          calculation_method: 'ISO 14040/14044',
          data_source: 'Heritage grain LCA study',
          verification_body: 'Scottish Agricultural College',
          valid_until: '2025-12-31'
        },
        productAttributes: {
          ingredient_type: 'Grain',
          variety: 'Highland Heritage Rye',
          protein_content_percentage: 13.2,
          moisture_content_percentage: 12.8,
          origin_country: 'Scotland',
          organic_certified: false,
          typical_usage_per_unit: 1.8,
          usage_unit: 'kg',
          harvest_year: 2024
        },
        basePrice: 1.65,
        currency: 'GBP',
        minimumOrderQuantity: 800,
        leadTimeDays: 12,
        certifications: ['Scottish Quality Assured', 'Heritage Seed Foundation'],
        isVerified: true,
      }
    ]);

    console.log('✅ Supplier products created successfully');
    console.log('✅ Ingredient suppliers and products created successfully');
    console.log('🎉 Database seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    // Connection automatically closed for neon-http
  }
}

seedSuppliers().catch(console.error);