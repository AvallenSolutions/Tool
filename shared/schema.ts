import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  decimal,
  uuid,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  role: varchar("role", { length: 50 }).notNull().default("user"), // 'user' or 'admin'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Companies table
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  industry: varchar("industry"),
  size: varchar("size"), // small, medium, large
  address: text("address"),
  country: varchar("country"),
  website: varchar("website"),
  ownerId: varchar("owner_id").references(() => users.id),
  onboardingComplete: boolean("onboarding_complete").default(false),
  currentReportingPeriodStart: date("current_reporting_period_start"),
  currentReportingPeriodEnd: date("current_reporting_period_end"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company operational data (Scope 1 & 2)
export const companyData = pgTable("company_data", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  reportingPeriodStart: date("reporting_period_start"),
  reportingPeriodEnd: date("reporting_period_end"),
  
  // Energy consumption
  electricityConsumption: decimal("electricity_consumption", { precision: 10, scale: 2 }),
  gasConsumption: decimal("gas_consumption", { precision: 10, scale: 2 }),
  fuelConsumption: decimal("fuel_consumption", { precision: 10, scale: 2 }),
  
  // Water usage
  waterConsumption: decimal("water_consumption", { precision: 10, scale: 2 }),
  
  // Waste generation
  wasteGenerated: decimal("waste_generated", { precision: 10, scale: 2 }),
  wasteRecycled: decimal("waste_recycled", { precision: 10, scale: 2 }),
  
  // Calculated emissions
  scope1Emissions: decimal("scope1_emissions", { precision: 10, scale: 2 }),
  scope2Emissions: decimal("scope2_emissions", { precision: 10, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table - Enhanced unified schema
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  
  // Basic Information
  name: varchar("name").notNull(),
  sku: varchar("sku").notNull(),
  type: varchar("type"), // spirit, wine, beer, non-alcoholic, cider, liqueur, other
  volume: varchar("volume"), // e.g., 500ml, 750ml
  description: text("description"),
  packShotUrl: text("pack_shot_url"), // Product photo URL
  
  // Production Information
  productionModel: varchar("production_model"), // own, contract, hybrid
  contractManufacturerId: integer("contract_manufacturer_id"),
  annualProductionVolume: decimal("annual_production_volume", { precision: 10, scale: 2 }),
  productionUnit: varchar("production_unit").default("bottles"), // bottles, liters, cases, kg
  
  // Enhanced Ingredients (comprehensive JSONB structure)
  ingredients: jsonb("ingredients").$type<Array<{
    name: string;
    type: 'grain' | 'fruit' | 'botanical' | 'additive' | 'water' | 'yeast' | 'other';
    amount: number;
    unit: string;
    origin?: string;
    organicCertified: boolean;
    transportDistance?: number;
    transportMode?: 'truck' | 'rail' | 'ship' | 'air' | 'pipeline';
    supplier?: string;
    processingMethod?: string;
  }>>(),
  
  // Packaging - Primary Container
  bottleName: varchar("bottle_name"), // Container name like "Frugal Bottle", "750ml Burgundy Bottle"
  bottleMaterial: varchar("bottle_material"), // glass, aluminum, pet, hdpe, paperboard, tetrapack, bag-in-box
  bottleWeight: decimal("bottle_weight", { precision: 10, scale: 3 }),
  bottleRecycledContent: decimal("bottle_recycled_content", { precision: 5, scale: 2 }),
  bottleRecyclability: varchar("bottle_recyclability"), // fully-recyclable, partially-recyclable, not-recyclable
  bottleColor: varchar("bottle_color"),
  bottleThickness: decimal("bottle_thickness", { precision: 10, scale: 3 }),
  
  // Packaging - Labels & Printing
  labelMaterial: varchar("label_material"), // paper, plastic, metal, fabric, none
  labelWeight: decimal("label_weight", { precision: 10, scale: 3 }),
  labelPrintingMethod: varchar("label_printing_method"), // digital, offset, flexographic, screen, none
  labelInkType: varchar("label_ink_type"), // water-based, solvent-based, uv-cured, eco-friendly, none
  labelSize: decimal("label_size", { precision: 10, scale: 2 }),
  
  // Packaging - Closure System
  closureType: varchar("closure_type"), // cork, screw-cap, crown-cap, can-top, pump, none
  closureMaterial: varchar("closure_material"), // aluminum, plastic, cork, synthetic-cork, other
  closureWeight: decimal("closure_weight", { precision: 10, scale: 3 }),
  hasBuiltInClosure: boolean("has_built_in_closure").default(false),
  linerMaterial: varchar("liner_material"),
  
  // Packaging - Secondary
  hasSecondaryPackaging: boolean("has_secondary_packaging").default(false),
  boxMaterial: varchar("box_material"), // cardboard, plastic, wood, metal, none
  boxWeight: decimal("box_weight", { precision: 10, scale: 3 }),
  fillerMaterial: varchar("filler_material"), // foam, paper, plastic, none
  fillerWeight: decimal("filler_weight", { precision: 10, scale: 3 }),
  
  // Production Process - Energy
  electricityKwh: decimal("electricity_kwh", { precision: 10, scale: 3 }),
  gasM3: decimal("gas_m3", { precision: 10, scale: 3 }),
  steamKg: decimal("steam_kg", { precision: 10, scale: 3 }),
  fuelLiters: decimal("fuel_liters", { precision: 10, scale: 3 }),
  renewableEnergyPercent: decimal("renewable_energy_percent", { precision: 5, scale: 2 }),
  
  // Production Process - Water
  processWaterLiters: decimal("process_water_liters", { precision: 10, scale: 2 }),
  cleaningWaterLiters: decimal("cleaning_water_liters", { precision: 10, scale: 2 }),
  coolingWaterLiters: decimal("cooling_water_liters", { precision: 10, scale: 2 }),
  wasteWaterTreatment: boolean("waste_water_treatment").default(false),
  
  // Production Process - Waste
  organicWasteKg: decimal("organic_waste_kg", { precision: 10, scale: 3 }),
  packagingWasteKg: decimal("packaging_waste_kg", { precision: 10, scale: 3 }),
  hazardousWasteKg: decimal("hazardous_waste_kg", { precision: 10, scale: 3 }),
  wasteRecycledPercent: decimal("waste_recycled_percent", { precision: 5, scale: 2 }),
  
  // Production Methods (JSONB for flexibility)
  productionMethods: jsonb("production_methods").$type<Record<string, any>>(),
  
  // Distribution
  averageTransportDistance: decimal("average_transport_distance", { precision: 10, scale: 2 }),
  primaryTransportMode: varchar("primary_transport_mode"), // truck, rail, ship, air, pipeline
  distributionCenters: integer("distribution_centers"),
  coldChainRequired: boolean("cold_chain_required").default(false),
  packagingEfficiency: decimal("packaging_efficiency", { precision: 5, scale: 2 }),
  
  // End of Life
  returnableContainer: boolean("returnable_container").default(false),
  recyclingRate: decimal("recycling_rate", { precision: 5, scale: 2 }),
  disposalMethod: varchar("disposal_method"), // recycling, landfill, incineration, composting
  consumerEducation: text("consumer_education"),
  
  // Certifications
  certifications: jsonb("certifications").$type<string[]>(),
  
  // Calculated footprints
  carbonFootprint: decimal("carbon_footprint", { precision: 10, scale: 4 }),
  waterFootprint: decimal("water_footprint", { precision: 10, scale: 2 }),
  
  // Status and priorities
  status: varchar("status").default("active"), // active, discontinued, development
  isMainProduct: boolean("is_main_product").default(false),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product inputs/ingredients - Enhanced for OpenLCA
export const productInputs = pgTable("product_inputs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  inputName: varchar("input_name"),
  inputType: varchar("input_type"), // ingredient, packaging, etc.
  quantity: decimal("quantity", { precision: 10, scale: 4 }),
  unit: varchar("unit"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  
  // Link to verified supplier product (overrides manual data entry)
  supplierProductId: uuid("supplier_product_id").references(() => supplierProducts.id),
  
  // OpenLCA Integration Fields
  inputCategory: varchar("input_category"), // agricultural_inputs, transport_inputs, processing_inputs, etc.
  olcaFlowId: varchar("olca_flow_id"), // OpenLCA flow ID
  olcaProcessId: varchar("olca_process_id"), // OpenLCA process ID
  
  // Transport data
  transportMode: varchar("transport_mode"), // lorry, rail, ship, air
  transportDistance: decimal("transport_distance", { precision: 10, scale: 2 }), // km
  originLocation: varchar("origin_location"),
  
  // Processing data
  energyConsumption: decimal("energy_consumption", { precision: 10, scale: 4 }), // kWh
  waterUsage: decimal("water_usage", { precision: 10, scale: 4 }), // liters
  wasteOutput: decimal("waste_output", { precision: 10, scale: 4 }), // kg
  
  // Environmental impact per unit
  carbonIntensity: decimal("carbon_intensity", { precision: 10, scale: 4 }),
  waterIntensity: decimal("water_intensity", { precision: 10, scale: 4 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Suppliers table (client-specific suppliers)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  contactPerson: varchar("contact_person"),
  phone: varchar("phone"),
  address: text("address"),
  supplierType: varchar("supplier_type"), // ingredient, packaging, contract_manufacturer
  status: varchar("status").default("not_started"), // not_started, invited, in_progress, completed
  
  // Unique token for supplier portal access
  portalToken: varchar("portal_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  
  // Submitted data
  submittedData: jsonb("submitted_data"),
  submittedAt: timestamp("submitted_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verified suppliers table (global pre-vetted supplier network)
export const verifiedSuppliers = pgTable("verified_suppliers", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierName: varchar("supplier_name", { length: 255 }).notNull().unique(),
  supplierCategory: varchar("supplier_category", { length: 100 }).notNull(), // bottle_producer, label_maker, closure_producer, secondary_packaging, ingredient_supplier, contract_distillery
  website: varchar("website", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  description: text("description"),
  location: varchar("location"), // Country or region (legacy field)
  
  // NEW COLUMNS FOR SUPPLIER DATA CAPTURE WORKFLOWS
  submittedBy: varchar("submitted_by", { length: 50 }).notNull().default('ADMIN'), // 'ADMIN', 'SUPPLIER', 'CLIENT'
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default('pending_review'), // 'pending_review', 'verified', 'client_provided'
  submittedByUserId: varchar("submitted_by_user_id").references(() => users.id), // User who submitted the data
  submittedByCompanyId: integer("submitted_by_company_id").references(() => companies.id), // Company that submitted (for CLIENT submissions)
  
  // ADDRESS INFORMATION FOR GEOCODING
  addressStreet: varchar("address_street", { length: 255 }),
  addressCity: varchar("address_city", { length: 100 }),
  addressPostalCode: varchar("address_postal_code", { length: 50 }),
  addressCountry: varchar("address_country", { length: 100 }),
  
  // GEOCODED COORDINATES
  latitude: decimal("latitude", { precision: 9, scale: 6 }), // GPS latitude for distance calculation
  longitude: decimal("longitude", { precision: 9, scale: 6 }), // GPS longitude for distance calculation
  geocodedAt: timestamp("geocoded_at"), // When coordinates were last updated
  
  // Legacy verification status (keeping for backward compatibility)
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  
  // Admin notes
  adminNotes: text("admin_notes"),
  
  // Image storage
  logoUrl: varchar("logo_url", { length: 500 }), // Public URL to supplier's logo image
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier products table (products offered by verified suppliers)
export const supplierProducts = pgTable("supplier_products", {
  id: uuid("id").primaryKey().defaultRandom(),
  supplierId: uuid("supplier_id").notNull().references(() => verifiedSuppliers.id),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productDescription: text("product_description"),
  sku: varchar("sku"), // Supplier's SKU/product code
  
  // LCA data handling
  hasPrecalculatedLca: boolean("has_precalculated_lca").notNull().default(false),
  lcaDataJson: jsonb("lca_data_json"), // Pre-calculated LCA results
  productAttributes: jsonb("product_attributes"), // Raw material data for calculation
  
  // NEW: Data capture workflow fields
  submittedBy: varchar("submitted_by", { length: 50 }).notNull().default('ADMIN'), // 'ADMIN', 'SUPPLIER', 'CLIENT'
  submittedByUserId: varchar("submitted_by_user_id").references(() => users.id),
  submittedByCompanyId: integer("submitted_by_company_id").references(() => companies.id),
  
  // Verification and quality
  isVerified: boolean("is_verified").notNull().default(false),
  verifiedBy: varchar("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  
  // Pricing and availability (optional)
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).default("USD"),
  minimumOrderQuantity: integer("minimum_order_quantity"),
  leadTimeDays: integer("lead_time_days"),
  
  // Quality certifications
  certifications: jsonb("certifications").$type<string[]>(),
  
  // Admin workflow
  submissionStatus: varchar("submission_status").default("pending"), // pending, approved, rejected, needs_revision
  adminNotes: text("admin_notes"),
  
  // Image storage
  imageUrl: varchar("image_url", { length: 500 }), // Public URL to product's photo
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Supplier invitations table (for invitation token management)
export const supplierInvitations = pgTable("supplier_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  token: varchar("token", { length: 255 }).notNull().unique(), // JWT token for invitation
  supplierEmail: varchar("supplier_email", { length: 255 }).notNull(),
  supplierName: varchar("supplier_name", { length: 255 }),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  invitedByCompany: integer("invited_by_company").references(() => companies.id),
  
  // Token lifecycle
  status: varchar("status", { length: 50 }).notNull().default("pending"), // pending, completed, expired, cancelled
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  
  // Optional invitation context
  invitationMessage: text("invitation_message"),
  expectedSupplierCategory: varchar("expected_supplier_category", { length: 100 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Uploaded documents table
export const uploadedDocuments = pgTable("uploaded_documents", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  mimeType: varchar("mime_type").notNull(),
  fileSize: integer("file_size"),
  documentType: varchar("document_type"), // utility_bill, waste_report, energy_certificate, etc.
  
  // OCR extracted data
  extractedData: jsonb("extracted_data"),
  processingStatus: varchar("processing_status").default("pending"), // pending, processing, completed, failed
  processingError: text("processing_error"),
  confidence: decimal("confidence", { precision: 3, scale: 2 }),
  
  // Metadata
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reports table
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  reportType: varchar("report_type"), // quarterly, annual, custom
  reportingPeriodStart: date("reporting_period_start"),
  reportingPeriodEnd: date("reporting_period_end"),
  
  status: varchar("status").default("draft"), // draft, generating, completed, under_review, approved, rejected
  
  // Calculated totals
  totalScope1: decimal("total_scope1", { precision: 10, scale: 2 }),
  totalScope2: decimal("total_scope2", { precision: 10, scale: 2 }),
  totalScope3: decimal("total_scope3", { precision: 10, scale: 2 }),
  totalWaterUsage: decimal("total_water_usage", { precision: 10, scale: 2 }),
  totalWasteGenerated: decimal("total_waste_generated", { precision: 10, scale: 2 }),
  
  // OpenLCA Integration - Store detailed LCA results
  reportData: jsonb("report_data"), // Store detailed LCA results from OpenLCA
  
  // Expert review
  reviewRequested: boolean("review_requested").default(false),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewComments: text("review_comments"),
  
  // Generated files
  pdfFilePath: varchar("pdf_file_path"),
  enhancedPdfFilePath: varchar("enhanced_pdf_file_path"),
  enhancedReportStatus: varchar("enhanced_report_status").default("not_generated"), // not_generated, generating, completed, failed
  totalCarbonFootprint: decimal("total_carbon_footprint", { precision: 10, scale: 3 }),
  
  // Admin approval fields
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenLCA Flow Mappings - For mapping user inputs to OpenLCA flows
export const olcaFlowMappings = pgTable("olca_flow_mappings", {
  id: serial("id").primaryKey(),
  inputName: varchar("input_name").notNull(),
  inputType: varchar("input_type").notNull(),
  inputCategory: varchar("input_category").notNull(),
  olcaFlowId: varchar("olca_flow_id").notNull(),
  olcaFlowName: varchar("olca_flow_name").notNull(),
  olcaUnit: varchar("olca_unit"),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OpenLCA Process Mappings - For mapping processes to OpenLCA processes
export const olcaProcessMappings = pgTable("olca_process_mappings", {
  id: serial("id").primaryKey(),
  processName: varchar("process_name").notNull(),
  processType: varchar("process_type").notNull(),
  olcaProcessId: varchar("olca_process_id").notNull(),
  olcaProcessName: varchar("olca_process_name").notNull(),
  region: varchar("region"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// LCA Calculation Jobs - For tracking background LCA calculations
export const lcaCalculationJobs = pgTable("lca_calculation_jobs", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id),
  jobId: varchar("job_id").notNull(), // Bull job ID
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  progress: integer("progress").default(0), // 0-100
  
  // OpenLCA specific data
  olcaSystemId: varchar("olca_system_id"), // OpenLCA product system ID
  olcaSystemName: varchar("olca_system_name"),
  
  // Results
  results: jsonb("results"), // Store detailed LCA results
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Contract producer invitations
export const contractProducerInvitations = pgTable("contract_producer_invitations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  productId: integer("product_id").notNull().references(() => products.id),
  producerName: text("producer_name").notNull(),
  producerEmail: text("producer_email").notNull(),
  invitationToken: text("invitation_token").notNull().unique(),
  invitationMessage: text("invitation_message"),
  status: text("status").notNull().default("pending"), // 'pending', 'submitted', 'completed'
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"),
  lcaData: jsonb("lca_data"), // Submitted LCA data from producer
});

// Relations
export const userRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.id],
    references: [companies.ownerId],
  }),
}));

export const companyRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, {
    fields: [companies.ownerId],
    references: [users.id],
  }),
  companyData: many(companyData),
  products: many(products),
  suppliers: many(suppliers),
  reports: many(reports),
}));

export const productRelations = relations(products, ({ one, many }) => ({
  company: one(companies, {
    fields: [products.companyId],
    references: [companies.id],
  }),
  inputs: many(productInputs),
  contractManufacturer: one(suppliers, {
    fields: [products.contractManufacturerId],
    references: [suppliers.id],
  }),
}));

export const supplierRelations = relations(suppliers, ({ one, many }) => ({
  company: one(companies, {
    fields: [suppliers.companyId],
    references: [companies.id],
  }),
  productInputs: many(productInputs),
}));

export const productInputRelations = relations(productInputs, ({ one }) => ({
  product: one(products, {
    fields: [productInputs.productId],
    references: [products.id],
  }),
  supplier: one(suppliers, {
    fields: [productInputs.supplierId],
    references: [suppliers.id],
  }),
  supplierProduct: one(supplierProducts, {
    fields: [productInputs.supplierProductId],
    references: [supplierProducts.id],
  }),
}));

export const verifiedSupplierRelations = relations(verifiedSuppliers, ({ many }) => ({
  products: many(supplierProducts),
}));

export const supplierProductRelations = relations(supplierProducts, ({ one, many }) => ({
  supplier: one(verifiedSuppliers, {
    fields: [supplierProducts.supplierId],
    references: [verifiedSuppliers.id],
  }),
  productInputs: many(productInputs),
}));

export const companyDataRelations = relations(companyData, ({ one }) => ({
  company: one(companies, {
    fields: [companyData.companyId],
    references: [companies.id],
  }),
}));

export const reportRelations = relations(reports, ({ one }) => ({
  company: one(companies, {
    fields: [reports.companyId],
    references: [companies.id],
  }),
}));

export const uploadedDocumentRelations = relations(uploadedDocuments, ({ one }) => ({
  company: one(companies, {
    fields: [uploadedDocuments.companyId],
    references: [companies.id],
  }),
  uploadedBy: one(users, {
    fields: [uploadedDocuments.uploadedBy],
    references: [users.id],
  }),
}));

export const lcaCalculationJobRelations = relations(lcaCalculationJobs, ({ one }) => ({
  product: one(products, {
    fields: [lcaCalculationJobs.productId],
    references: [products.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profileImageUrl: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUploadedDocumentSchema = createInsertSchema(uploadedDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Product types
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Convert number fields to proper types for form handling
  annualProductionVolume: z.union([z.string(), z.number()]).optional().nullable(),
  bottleWeight: z.union([z.string(), z.number()]).optional().nullable(),
  bottleRecycledContent: z.union([z.string(), z.number()]).optional().nullable(),
  labelWeight: z.union([z.string(), z.number()]).optional().nullable(),
  labelSize: z.union([z.string(), z.number()]).optional().nullable(),
  closureWeight: z.union([z.string(), z.number()]).optional().nullable(),
  boxWeight: z.union([z.string(), z.number()]).optional().nullable(),
  fillerWeight: z.union([z.string(), z.number()]).optional().nullable(),
  electricityKwh: z.union([z.string(), z.number()]).optional().nullable(),
  gasM3: z.union([z.string(), z.number()]).optional().nullable(),
  steamKg: z.union([z.string(), z.number()]).optional().nullable(),
  fuelLiters: z.union([z.string(), z.number()]).optional().nullable(),
  renewableEnergyPercent: z.union([z.string(), z.number()]).optional().nullable(),
  processWaterLiters: z.union([z.string(), z.number()]).optional().nullable(),
  cleaningWaterLiters: z.union([z.string(), z.number()]).optional().nullable(),
  coolingWaterLiters: z.union([z.string(), z.number()]).optional().nullable(),
  organicWasteKg: z.union([z.string(), z.number()]).optional().nullable(),
  packagingWasteKg: z.union([z.string(), z.number()]).optional().nullable(),
  hazardousWasteKg: z.union([z.string(), z.number()]).optional().nullable(),
  wasteRecycledPercent: z.union([z.string(), z.number()]).optional().nullable(),
  averageTransportDistance: z.union([z.string(), z.number()]).optional().nullable(),
  distributionCenters: z.union([z.string(), z.number()]).optional().nullable(),
  packagingEfficiency: z.union([z.string(), z.number()]).optional().nullable(),
  recyclingRate: z.union([z.string(), z.number()]).optional().nullable(),
  carbonFootprint: z.union([z.string(), z.number()]).optional().nullable(),
  waterFootprint: z.union([z.string(), z.number()]).optional().nullable(),
  companyId: z.number().optional(),
});
export type InsertProductType = z.infer<typeof insertProductSchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type UploadedDocument = typeof uploadedDocuments.$inferSelect;
export type InsertUploadedDocument = z.infer<typeof insertUploadedDocumentSchema>;
export type CompanyData = typeof companyData.$inferSelect;
export type ProductInput = typeof productInputs.$inferSelect;

// OpenLCA Types
export type OlcaFlowMapping = typeof olcaFlowMappings.$inferSelect;
export type InsertOlcaFlowMapping = typeof olcaFlowMappings.$inferInsert;
export type OlcaProcessMapping = typeof olcaProcessMappings.$inferSelect;
export type InsertOlcaProcessMapping = typeof olcaProcessMappings.$inferInsert;
export type LcaCalculationJob = typeof lcaCalculationJobs.$inferSelect;
export type InsertLcaCalculationJob = typeof lcaCalculationJobs.$inferInsert;

// Enhanced Product Input with OpenLCA fields
export type InsertProductInput = typeof productInputs.$inferInsert;
export const insertProductInputSchema = createInsertSchema(productInputs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProductInputType = z.infer<typeof insertProductInputSchema>;

// Verified Supplier Types
export type VerifiedSupplier = typeof verifiedSuppliers.$inferSelect;
export type InsertVerifiedSupplier = typeof verifiedSuppliers.$inferInsert;
export const insertVerifiedSupplierSchema = createInsertSchema(verifiedSuppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SupplierProduct = typeof supplierProducts.$inferSelect;
export type InsertSupplierProduct = typeof supplierProducts.$inferInsert;
export const insertSupplierProductSchema = createInsertSchema(supplierProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Supplier Invitation Types
export type SupplierInvitation = typeof supplierInvitations.$inferSelect;
export type InsertSupplierInvitation = typeof supplierInvitations.$inferInsert;
export const insertSupplierInvitationSchema = createInsertSchema(supplierInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Category-specific product attribute schemas
export const bottleProducerAttributesSchema = z.object({
  material_type: z.enum(['Glass', 'PET', 'Aluminum', 'HDPE']),
  weight_grams: z.number().positive(),
  recycled_content_percentage: z.number().min(0).max(100),
  color: z.string().optional(),
  height_mm: z.number().positive().optional(),
  diameter_mm: z.number().positive().optional(),
});

export const labelMakerAttributesSchema = z.object({
  material_type: z.enum(['Paper - Coated', 'Paper - Uncoated', 'Polypropylene', 'Vinyl', 'Polyester']),
  weight_grams_per_sq_meter: z.number().positive(),
  dimensions_mm: z.string(), // e.g., "80x120"
  recycled_content_percentage: z.number().min(0).max(100),
  adhesive_type: z.enum(['Water-based', 'Solvent-based', 'Hot-melt', 'UV-curable']),
  finish: z.enum(['Matte', 'Gloss', 'Semi-gloss']).optional(),
});

export const closureProducerAttributesSchema = z.object({
  material_type: z.enum(['Natural Cork', 'Synthetic Cork', 'Aluminum', 'Plastic', 'Steel']),
  weight_grams: z.number().positive(),
  diameter_mm: z.number().positive().optional(),
  length_mm: z.number().positive().optional(),
  liner_material: z.string().optional(),
});

export const secondaryPackagingAttributesSchema = z.object({
  material_type: z.enum(['Corrugated Cardboard', 'Paperboard', 'Plastic', 'Wood']),
  weight_grams: z.number().positive(),
  recycled_content_percentage: z.number().min(0).max(100),
  dimensions_mm: z.string().optional(), // e.g., "300x200x100"
  strength_grade: z.string().optional(),
});

export const ingredientSupplierAttributesSchema = z.object({
  ingredient_type: z.enum(['Grain', 'Fruit', 'Botanical', 'Additive', 'Water', 'Yeast', 'Sugar', 'Acid']),
  origin_country: z.string(),
  organic_certified: z.boolean().default(false),
  processing_method: z.string().optional(),
  alcohol_content_percentage: z.number().min(0).max(100).optional(),
  density_kg_per_liter: z.number().positive().optional(),
});

// Pre-calculated LCA data schema
export const lcaDataSchema = z.object({
  carbon_footprint_kg_co2_eq: z.number(),
  water_footprint_liters: z.number(),
  energy_consumption_mj: z.number(),
  waste_generation_kg: z.number().optional(),
  land_use_m2_year: z.number().optional(),
  acidification_potential: z.number().optional(),
  eutrophication_potential: z.number().optional(),
  ozone_depletion_potential: z.number().optional(),
  calculation_method: z.string(), // e.g., "ISO 14040/14044", "PEF", "EPD"
  verification_body: z.string().optional(),
  valid_until: z.string().optional(), // ISO date string
  data_source: z.string(), // e.g., "Third-party LCA", "EPD", "Internal calculation"
});

// LCA Questionnaires table - stores structured LCA data collection
export const lcaQuestionnaires = pgTable("lca_questionnaires", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: integer("product_id").references(() => products.id).notNull(),
  reportingPeriodStart: date("reporting_period_start").notNull(),
  reportingPeriodEnd: date("reporting_period_end").notNull(),
  
  // Enhanced structured LCA data as JSONB - supports both legacy and new enhanced format
  lcaData: jsonb("lca_data").notNull().$type<{
    // Basic product info
    basic_info?: {
      product_name: string;
      sku_code: string;
      product_type: string;
      volume_ml: number;
    };
    // Enhanced agriculture data
    agriculture: {
      mainCropType?: string; // Legacy field - maintained for backward compatibility
      main_crop_type?: string; // New enhanced field
      yieldTonPerHectare?: number; // Legacy field
      yield_ton_per_hectare?: number; // New enhanced field
      dieselLPerHectare?: number; // Legacy field
      diesel_l_per_hectare?: number; // New enhanced field
      sequestrationTonCo2PerTonCrop?: number; // Legacy field
      sequestration_ton_co2_per_ton_crop?: number; // New enhanced field
    };
    // Enhanced inbound transport
    inboundTransport?: { // Legacy structure
      distanceKm: number;
      mode: string;
    };
    inbound_transport?: { // New enhanced structure
      distance_km: number;
      mode: string;
    };
    // Enhanced processing data
    processing: {
      // Legacy fields - maintained for backward compatibility
      waterM3PerTonCrop?: number;
      electricityKwhPerTonCrop?: number;
      juiceLPerTonCrop?: number;
      pulpKgPerTonCrop?: number;
      ciderLPerLSpirit?: number;
      lpgKgPerLAlcohol?: number;
      netWaterUseLPerBottle?: number;
      spiritYieldLPerTonCrop?: number;
      angelsSharePercentage?: number;
      // New enhanced fields
      water_m3_per_ton_crop?: number;
      electricity_kwh_per_ton_crop?: number;
      lpg_kg_per_l_alcohol?: number;
      net_water_use_l_per_bottle?: number;
      angels_share_percentage?: number;
    };
    // Enhanced packaging structure
    packaging?: Array<{ // Legacy format
      component: string;
      material: string;
      weightGrams: number;
    }> | Array<{ // New enhanced format
      component_type: 'Container' | 'Label' | 'Stopper/Closure' | 'Secondary Packaging';
      container_name?: string;
      material: string;
      weight_grams: number;
      recycled_content_percentage?: number;
      label_material?: string;
      label_weight_grams?: number;
    }>;
    // Enhanced distribution data
    distribution?: {
      avg_distance_to_dc_km: number;
      primary_transport_mode: string;
    };
    // Enhanced end of life data
    end_of_life?: {
      recycling_rate_percentage: number;
      primary_disposal_method: string;
    };
  }>(),
  
  status: varchar("status").notNull().default("incomplete"), // incomplete, complete, processing, calculated
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Uploaded Supplier LCAs table - manages uploaded LCA/EPD documents for contract producers
export const uploadedSupplierLcas = pgTable("uploaded_supplier_lcas", {
  id: uuid("id").primaryKey().defaultRandom(),
  questionnaireId: uuid("questionnaire_id").references(() => lcaQuestionnaires.id).notNull(),
  fileUrl: varchar("file_url", { length: 255 }).notNull(),
  originalFileName: varchar("original_file_name", { length: 255 }),
  
  verificationStatus: varchar("verification_status", { length: 50 }).notNull().default("pending_review"), // pending_review, approved, rejected
  
  // Extracted data points from manual review
  extractedDataJson: jsonb("extracted_data_json").$type<{
    kgCo2ePerLitre?: number;
    waterFootprintLPerLitre?: number;
    energyMjPerLitre?: number;
    reviewNotes?: string;
    reviewedBy?: string;
    reviewedAt?: string;
  }>(),
  
  // Admin review fields
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations for new LCA tables
export const lcaQuestionnaireRelations = relations(lcaQuestionnaires, ({ one, many }) => ({
  product: one(products, {
    fields: [lcaQuestionnaires.productId],
    references: [products.id],
  }),
  uploadedLcas: many(uploadedSupplierLcas),
}));

export const uploadedSupplierLcaRelations = relations(uploadedSupplierLcas, ({ one }) => ({
  questionnaire: one(lcaQuestionnaires, {
    fields: [uploadedSupplierLcas.questionnaireId],
    references: [lcaQuestionnaires.id],
  }),
  reviewedByUser: one(users, {
    fields: [uploadedSupplierLcas.reviewedBy],
    references: [users.id],
  }),
}));

// Type exports for new LCA tables
// Enhanced LCA Data validation schema
export const enhancedLcaDataSchema = z.object({
  basic_info: z.object({
    product_name: z.string(),
    sku_code: z.string(),
    product_type: z.string(),
    volume_ml: z.number().positive(),
  }).optional(),
  agriculture: z.object({
    // Legacy fields for backward compatibility
    mainCropType: z.string().optional(),
    yieldTonPerHectare: z.number().positive().optional(),
    dieselLPerHectare: z.number().nonnegative().optional(),
    sequestrationTonCo2PerTonCrop: z.number().nonnegative().optional(),
    // New enhanced fields
    main_crop_type: z.string().optional(),
    yield_ton_per_hectare: z.number().positive().optional(),
    diesel_l_per_hectare: z.number().nonnegative().optional(),
    sequestration_ton_co2_per_ton_crop: z.number().nonnegative().optional(),
  }),
  inboundTransport: z.object({
    distanceKm: z.number().positive(),
    mode: z.string(),
  }).optional(),
  inbound_transport: z.object({
    distance_km: z.number().positive(),
    mode: z.string(),
  }).optional(),
  processing: z.object({
    // Legacy fields
    waterM3PerTonCrop: z.number().nonnegative().optional(),
    electricityKwhPerTonCrop: z.number().nonnegative().optional(),
    juiceLPerTonCrop: z.number().nonnegative().optional(),
    pulpKgPerTonCrop: z.number().nonnegative().optional(),
    ciderLPerLSpirit: z.number().nonnegative().optional(),
    lpgKgPerLAlcohol: z.number().nonnegative().optional(),
    netWaterUseLPerBottle: z.number().nonnegative().optional(),
    spiritYieldLPerTonCrop: z.number().nonnegative().optional(),
    angelsSharePercentage: z.number().min(0).max(100).optional(),
    // New enhanced fields
    water_m3_per_ton_crop: z.number().nonnegative().optional(),
    electricity_kwh_per_ton_crop: z.number().nonnegative().optional(),
    lpg_kg_per_l_alcohol: z.number().nonnegative().optional(),
    net_water_use_l_per_bottle: z.number().nonnegative().optional(),
    angels_share_percentage: z.number().min(0).max(100).optional(),
  }),
  packaging: z.array(
    z.union([
      // Legacy format
      z.object({
        component: z.string(),
        material: z.string(),
        weightGrams: z.number().positive(),
      }),
      // New enhanced format
      z.object({
        component_type: z.enum(['Container', 'Label', 'Stopper/Closure', 'Secondary Packaging']),
        container_name: z.string().optional(),
        material: z.string(),
        weight_grams: z.number().positive(),
        recycled_content_percentage: z.number().min(0).max(100).optional(),
        label_material: z.string().optional(),
        label_weight_grams: z.number().positive().optional(),
      }),
    ])
  ).optional(),
  distribution: z.object({
    avg_distance_to_dc_km: z.number().positive(),
    primary_transport_mode: z.string(),
  }).optional(),
  end_of_life: z.object({
    recycling_rate_percentage: z.number().min(0).max(100),
    primary_disposal_method: z.string(),
  }).optional(),
});

export type LcaQuestionnaire = typeof lcaQuestionnaires.$inferSelect;
export type InsertLcaQuestionnaire = typeof lcaQuestionnaires.$inferInsert;
export const insertLcaQuestionnaireSchema = createInsertSchema(lcaQuestionnaires).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lcaData: enhancedLcaDataSchema, // Use the enhanced validation schema
});

export type UploadedSupplierLca = typeof uploadedSupplierLcas.$inferSelect;
export type InsertUploadedSupplierLca = typeof uploadedSupplierLcas.$inferInsert;
export const insertUploadedSupplierLcaSchema = createInsertSchema(uploadedSupplierLcas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
