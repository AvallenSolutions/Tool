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

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").references(() => companies.id),
  name: varchar("name").notNull(),
  sku: varchar("sku").notNull(), // Product SKU code
  type: varchar("type"), // spirit, wine, beer, non-alcoholic
  volume: varchar("volume"), // Manual entry e.g., 500ml, 750ml
  size: varchar("size"), // Product size classification
  description: text("description"),
  productionModel: varchar("production_model"), // own, contract
  contractManufacturerId: integer("contract_manufacturer_id").references(() => suppliers.id),
  
  // Pack shot image
  packShotUrl: text("pack_shot_url"),
  
  // Production details
  annualProductionVolume: decimal("annual_production_volume", { precision: 10, scale: 2 }),
  productionUnit: varchar("production_unit").default("bottles"), // bottles, liters, kg
  
  // Ingredients (stored as JSON array)
  ingredients: jsonb("ingredients").$type<Array<{ name: string; amount: number; unit: string }>>(),
  
  // Bottle material and recycling
  bottleMaterial: varchar("bottle_material", { length: 100 }), // glass, aluminium, PET, paper, tetrapak
  bottleRecycledContent: decimal("bottle_recycled_content", { precision: 5, scale: 2 }), // percentage
  bottleWeight: decimal("bottle_weight", { precision: 10, scale: 2 }), // kg
  
  // Label information
  labelMaterial: varchar("label_material", { length: 100 }),
  labelWeight: decimal("label_weight", { precision: 10, scale: 2 }), // in grams
  
  // Closure information
  closureMaterial: varchar("closure_material", { length: 100 }),
  closureWeight: decimal("closure_weight", { precision: 10, scale: 3 }), // in grams
  hasBuiltInClosure: boolean("has_built_in_closure").default(false),
  
  // Other packaging
  capWeight: decimal("cap_weight", { precision: 10, scale: 2 }), // kg
  boxWeight: decimal("box_weight", { precision: 10, scale: 2 }), // kg for shipping
  
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

// Suppliers table
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
  // Convert number fields to proper types
  bottleRecycledContent: z.union([z.string(), z.number()]).optional().nullable(),
  labelWeight: z.union([z.string(), z.number()]).optional().nullable(),
  closureWeight: z.union([z.string(), z.number()]).optional().nullable(),
  packShotUrl: z.string().optional().nullable(),
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
