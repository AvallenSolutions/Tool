import {
  users,
  companies,
  products,
  suppliers,
  verifiedSuppliers,
  supplierProducts,
  reports,
  companyData,
  companyFootprintData,
  productInputs,
  uploadedDocuments,
  olcaFlowMappings,
  olcaProcessMappings,
  lcaCalculationJobs,
  lcaQuestionnaires,
  uploadedSupplierLcas,
  companySustainabilityData,
  companyGoals,
  customReports,
  productionFacilities,
  productFacilityMappings,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Product,
  type InsertProduct,
  type Supplier,
  type InsertSupplier,
  type VerifiedSupplier,
  type InsertVerifiedSupplier,
  type SupplierProduct,
  type InsertSupplierProduct,
  type Report,
  type InsertReport,
  type UploadedDocument,
  type InsertUploadedDocument,
  type CompanyData,
  type CompanyFootprintData,
  type InsertCompanyFootprintData,
  type ProductInput,
  type OlcaFlowMapping,
  type InsertOlcaFlowMapping,
  type OlcaProcessMapping,
  type InsertOlcaProcessMapping,
  type LcaCalculationJob,
  type InsertLcaCalculationJob,
  type LcaQuestionnaire,
  type InsertLcaQuestionnaire,
  type UploadedSupplierLca,
  type InsertUploadedSupplierLca,
  type CompanySustainabilityData,
  type InsertCompanySustainabilityData,
  type CompanyGoal,
  type InsertCompanyGoal,
  type CustomReport,
  type InsertCustomReport,
  type ProductionFacility,
  type InsertProductionFacility,
  type ProductFacilityMapping,
  type InsertProductFacilityMapping,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  
  // Company operations
  getCompanyByOwner(ownerId: string): Promise<Company | undefined>;
  getCompanyById(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  
  // Company sustainability data operations
  getCompanySustainabilityData(companyId: number): Promise<CompanySustainabilityData | undefined>;
  upsertCompanySustainabilityData(companyId: number, data: Partial<InsertCompanySustainabilityData>): Promise<CompanySustainabilityData>;
  
  // Company footprint data operations
  getCompanyFootprintData(companyId: number, scope?: number, dataType?: string): Promise<CompanyFootprintData[]>;
  createFootprintData(data: InsertCompanyFootprintData): Promise<CompanyFootprintData>;
  updateFootprintData(id: number, data: Partial<InsertCompanyFootprintData>): Promise<CompanyFootprintData>;
  deleteFootprintData(id: number): Promise<void>;
  
  // Product operations
  getProductsByCompany(companyId: number): Promise<Product[]>;
  getProductById(id: number): Promise<Product | undefined>;
  getAllProducts(): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  // Supplier operations (client-specific suppliers)
  getSuppliersByCompany(companyId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier>;
  getSupplierByToken(token: string): Promise<Supplier | undefined>;
  
  // Verified supplier network operations
  getVerifiedSuppliers(): Promise<VerifiedSupplier[]>;
  getVerifiedSuppliersByCategory(category: string): Promise<VerifiedSupplier[]>;
  getVerifiedSupplierById(id: string): Promise<VerifiedSupplier | undefined>;
  createVerifiedSupplier(supplier: InsertVerifiedSupplier): Promise<VerifiedSupplier>;
  updateVerifiedSupplier(id: string, updates: Partial<InsertVerifiedSupplier>): Promise<VerifiedSupplier>;
  
  // Supplier product operations
  getSupplierProducts(): Promise<SupplierProduct[]>;
  getSupplierProductsBySupplierId(supplierId: string): Promise<SupplierProduct[]>;
  getSupplierProductsByCategory(category: string): Promise<SupplierProduct[]>;
  getSupplierProductById(id: string): Promise<SupplierProduct | undefined>;
  createSupplierProduct(product: InsertSupplierProduct): Promise<SupplierProduct>;
  updateSupplierProduct(id: string, updates: Partial<InsertSupplierProduct>): Promise<SupplierProduct>;
  searchSupplierProducts(query: string, category?: string): Promise<SupplierProduct[]>;
  
  // Report operations
  getReportsByCompany(companyId: number): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: number, updates: Partial<InsertReport>): Promise<Report>;
  
  // Company data operations
  getCompanyData(companyId: number): Promise<CompanyData[]>;
  updateCompanyData(companyId: number, data: Partial<CompanyData>): Promise<CompanyData>;
  
  // Document upload operations
  getDocumentsByCompany(companyId: number): Promise<UploadedDocument[]>;
  createDocument(document: InsertUploadedDocument): Promise<UploadedDocument>;
  updateDocument(id: number, updates: Partial<InsertUploadedDocument>): Promise<UploadedDocument>;
  getDocumentById(id: number): Promise<UploadedDocument | undefined>;

  // OpenLCA Flow Mapping operations
  getAllFlowMappings(): Promise<OlcaFlowMapping[]>;
  createFlowMapping(mapping: InsertOlcaFlowMapping): Promise<OlcaFlowMapping>;
  updateFlowMapping(id: number, updates: Partial<InsertOlcaFlowMapping>): Promise<OlcaFlowMapping>;
  getFlowMappingsByInput(inputName: string, inputType: string): Promise<OlcaFlowMapping[]>;

  // OpenLCA Process Mapping operations
  getAllProcessMappings(): Promise<OlcaProcessMapping[]>;
  createProcessMapping(mapping: InsertOlcaProcessMapping): Promise<OlcaProcessMapping>;
  updateProcessMapping(id: number, updates: Partial<InsertOlcaProcessMapping>): Promise<OlcaProcessMapping>;
  getProcessMappingsByName(processName: string): Promise<OlcaProcessMapping[]>;

  // LCA Calculation Job operations
  createLcaCalculationJob(job: InsertLcaCalculationJob): Promise<LcaCalculationJob>;
  updateLcaCalculationJob(id: number, updates: Partial<InsertLcaCalculationJob>): Promise<LcaCalculationJob>;
  getLcaCalculationJobById(id: number): Promise<LcaCalculationJob | undefined>;
  getLcaCalculationJobsByProduct(productId: number): Promise<LcaCalculationJob[]>;
  getLcaCalculationJobByJobId(jobId: string): Promise<LcaCalculationJob | undefined>;

  // LCA Questionnaire operations
  createLcaQuestionnaire(questionnaire: InsertLcaQuestionnaire): Promise<LcaQuestionnaire>;
  getLcaQuestionnaireById(id: string): Promise<LcaQuestionnaire | undefined>;
  getLcaQuestionnairesByProduct(productId: number): Promise<LcaQuestionnaire[]>;
  updateLcaQuestionnaire(id: string, updates: Partial<InsertLcaQuestionnaire>): Promise<LcaQuestionnaire>;

  // Uploaded Supplier LCA operations
  createUploadedSupplierLca(upload: InsertUploadedSupplierLca): Promise<UploadedSupplierLca>;
  getUploadedSupplierLcasByQuestionnaire(questionnaireId: string): Promise<UploadedSupplierLca[]>;

  // Company Goals operations
  getGoalsByCompany(companyId: number): Promise<CompanyGoal[]>;
  createGoal(goal: InsertCompanyGoal): Promise<CompanyGoal>;
  updateGoal(id: string, updates: Partial<InsertCompanyGoal>): Promise<CompanyGoal>;

  // Custom Reports operations  
  getReportsByCompanyCustom(companyId: number): Promise<CustomReport[]>;
  createCustomReport(report: InsertCustomReport): Promise<CustomReport>;
  updateCustomReport(id: string, updates: Partial<InsertCustomReport>): Promise<CustomReport>;

  // Production Facilities operations
  getProductionFacilitiesByCompany(companyId: number): Promise<ProductionFacility[]>;
  getProductionFacilityById(id: number): Promise<ProductionFacility | undefined>;
  createProductionFacility(facility: InsertProductionFacility): Promise<ProductionFacility>;
  updateProductionFacility(id: number, updates: Partial<InsertProductionFacility>): Promise<ProductionFacility>;
  deleteProductionFacility(id: number): Promise<void>;

  // Product Facility Mapping operations
  getProductFacilityMappings(productId?: number, facilityId?: number): Promise<ProductFacilityMapping[]>;
  createProductFacilityMapping(mapping: InsertProductFacilityMapping): Promise<ProductFacilityMapping>;
  deleteProductFacilityMapping(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Company operations
  async getCompanyByOwner(ownerId: string): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.ownerId, ownerId))
      .orderBy(desc(companies.createdAt));
    return company;
  }

  async getCompanyById(id: number): Promise<Company | undefined> {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));
    return company;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company> {
    const [company] = await db
      .update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  // Product operations
  async getProductsByCompany(companyId: number): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(eq(products.companyId, companyId))
      .orderBy(desc(products.createdAt));
  }

  async getAllProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProductById(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db
      .insert(products)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Supplier operations
  async getSuppliersByCompany(companyId: number): Promise<Supplier[]> {
    return await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.companyId, companyId))
      .orderBy(desc(suppliers.createdAt));
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db
      .insert(suppliers)
      .values(supplier)
      .returning();
    return newSupplier;
  }

  async updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier> {
    const [supplier] = await db
      .update(suppliers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(suppliers.id, id))
      .returning();
    return supplier;
  }

  async getSupplierByToken(token: string): Promise<Supplier | undefined> {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.portalToken, token));
    return supplier;
  }

  // Verified supplier network operations
  async getVerifiedSuppliers(): Promise<VerifiedSupplier[]> {
    return await db
      .select()
      .from(verifiedSuppliers)
      .where(eq(verifiedSuppliers.isVerified, true))
      .orderBy(verifiedSuppliers.supplierName);
  }

  async getVerifiedSuppliersByCategory(category: string): Promise<VerifiedSupplier[]> {
    return await db
      .select()
      .from(verifiedSuppliers)
      .where(and(
        eq(verifiedSuppliers.isVerified, true),
        eq(verifiedSuppliers.supplierCategory, category)
      ))
      .orderBy(verifiedSuppliers.supplierName);
  }

  async getVerifiedSupplierById(id: string): Promise<VerifiedSupplier | undefined> {
    const [supplier] = await db
      .select()
      .from(verifiedSuppliers)
      .where(eq(verifiedSuppliers.id, id));
    return supplier;
  }

  async createVerifiedSupplier(supplier: InsertVerifiedSupplier): Promise<VerifiedSupplier> {
    const [newSupplier] = await db
      .insert(verifiedSuppliers)
      .values(supplier)
      .returning();
    return newSupplier;
  }

  async updateVerifiedSupplier(id: string, updates: Partial<InsertVerifiedSupplier>): Promise<VerifiedSupplier> {
    const [supplier] = await db
      .update(verifiedSuppliers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(verifiedSuppliers.id, id))
      .returning();
    return supplier;
  }

  // Supplier product operations
  async getSupplierProducts(): Promise<SupplierProduct[]> {
    return await db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.isVerified, true))
      .orderBy(supplierProducts.productName);
  }

  async getSupplierProductsBySupplierId(supplierId: string): Promise<SupplierProduct[]> {
    return await db
      .select()
      .from(supplierProducts)
      .where(and(
        eq(supplierProducts.supplierId, supplierId),
        eq(supplierProducts.isVerified, true)
      ))
      .orderBy(supplierProducts.productName);
  }

  async getSupplierProductsByCategory(category: string): Promise<SupplierProduct[]> {
    const results = await db
      .select({
        id: supplierProducts.id,
        supplierId: supplierProducts.supplierId,
        productName: supplierProducts.productName,
        productDescription: supplierProducts.productDescription,
        sku: supplierProducts.sku,
        hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
        lcaDataJson: supplierProducts.lcaDataJson,
        productAttributes: supplierProducts.productAttributes,
        submittedBy: supplierProducts.submittedBy,
        submittedByUserId: supplierProducts.submittedByUserId,
        submittedByCompanyId: supplierProducts.submittedByCompanyId,
        isVerified: supplierProducts.isVerified,
        verifiedBy: supplierProducts.verifiedBy,
        verifiedAt: supplierProducts.verifiedAt,
        basePrice: supplierProducts.basePrice,
        currency: supplierProducts.currency,
        minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
        leadTimeDays: supplierProducts.leadTimeDays,
        certifications: supplierProducts.certifications,
        submissionStatus: supplierProducts.submissionStatus,
        adminNotes: supplierProducts.adminNotes,
        imageUrl: supplierProducts.imageUrl,
        createdAt: supplierProducts.createdAt,
        updatedAt: supplierProducts.updatedAt,
      })
      .from(supplierProducts)
      .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
      .where(and(
        eq(verifiedSuppliers.supplierCategory, category),
        eq(verifiedSuppliers.isVerified, true),
        eq(supplierProducts.isVerified, true)
      ))
      .orderBy(supplierProducts.productName);
    return results as SupplierProduct[];
  }

  async getSupplierProductById(id: string): Promise<SupplierProduct | undefined> {
    const [product] = await db
      .select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, id));
    return product;
  }

  async createSupplierProduct(product: InsertSupplierProduct): Promise<SupplierProduct> {
    const [newProduct] = await db
      .insert(supplierProducts)
      .values(product)
      .returning();
    return newProduct;
  }

  async updateSupplierProduct(id: string, updates: Partial<InsertSupplierProduct>): Promise<SupplierProduct> {
    const [product] = await db
      .update(supplierProducts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(supplierProducts.id, id))
      .returning();
    return product;
  }

  async searchSupplierProducts(query: string, category?: string): Promise<SupplierProduct[]> {
    let whereClause = and(
      eq(supplierProducts.isVerified, true),
      eq(verifiedSuppliers.isVerified, true)
    );

    if (category) {
      whereClause = and(
        whereClause,
        eq(verifiedSuppliers.supplierCategory, category)
      );
    }

    // Add search filter for both product name and supplier name
    if (query && query.trim()) {
      const searchTerm = `%${query.toLowerCase().trim()}%`;
      whereClause = and(
        whereClause,
        or(
          ilike(supplierProducts.productName, searchTerm),
          ilike(verifiedSuppliers.supplierName, searchTerm),
          ilike(supplierProducts.productDescription, searchTerm),
          ilike(supplierProducts.sku, searchTerm)
        )
      );
    }

    const results = await db
      .select({
        id: supplierProducts.id,
        supplierId: supplierProducts.supplierId,
        productName: supplierProducts.productName,
        productDescription: supplierProducts.productDescription,
        sku: supplierProducts.sku,
        hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
        lcaDataJson: supplierProducts.lcaDataJson,
        productAttributes: supplierProducts.productAttributes,
        submittedBy: supplierProducts.submittedBy,
        submittedByUserId: supplierProducts.submittedByUserId,
        submittedByCompanyId: supplierProducts.submittedByCompanyId,
        isVerified: supplierProducts.isVerified,
        verifiedBy: supplierProducts.verifiedBy,
        verifiedAt: supplierProducts.verifiedAt,
        basePrice: supplierProducts.basePrice,
        currency: supplierProducts.currency,
        minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
        leadTimeDays: supplierProducts.leadTimeDays,
        certifications: supplierProducts.certifications,
        submissionStatus: supplierProducts.submissionStatus,
        adminNotes: supplierProducts.adminNotes,
        imageUrl: supplierProducts.imageUrl,
        createdAt: supplierProducts.createdAt,
        updatedAt: supplierProducts.updatedAt,
      })
      .from(supplierProducts)
      .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
      .where(whereClause)
      .orderBy(supplierProducts.productName);
    return results as SupplierProduct[];
  }

  // Report operations
  async getReportsByCompany(companyId: number): Promise<Report[]> {
    return await db
      .select()
      .from(reports)
      .where(eq(reports.companyId, companyId))
      .orderBy(desc(reports.createdAt));
  }

  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db
      .insert(reports)
      .values(report)
      .returning();
    return newReport;
  }

  async updateReport(id: number, updates: Partial<InsertReport>): Promise<Report> {
    const [report] = await db
      .update(reports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return report;
  }

  // Company data operations
  async getCompanyData(companyId: number): Promise<CompanyData[]> {
    return await db
      .select()
      .from(companyData)
      .where(eq(companyData.companyId, companyId))
      .orderBy(desc(companyData.createdAt));
  }

  async updateCompanyData(companyId: number, data: Partial<CompanyData>): Promise<CompanyData> {
    const [existingData] = await db
      .select()
      .from(companyData)
      .where(eq(companyData.companyId, companyId));

    if (existingData) {
      const [updatedData] = await db
        .update(companyData)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(companyData.companyId, companyId))
        .returning();
      return updatedData;
    } else {
      const [newData] = await db
        .insert(companyData)
        .values({ ...data, companyId } as any)
        .returning();
      return newData;
    }
  }

  // Company sustainability data operations
  async getCompanySustainabilityData(companyId: number): Promise<CompanySustainabilityData | undefined> {
    const [data] = await db
      .select()
      .from(companySustainabilityData)
      .where(eq(companySustainabilityData.companyId, companyId));
    return data;
  }

  async upsertCompanySustainabilityData(companyId: number, data: Partial<InsertCompanySustainabilityData>): Promise<CompanySustainabilityData> {
    const existing = await this.getCompanySustainabilityData(companyId);
    
    if (existing) {
      const [updated] = await db
        .update(companySustainabilityData)
        .set({ 
          ...data, 
          updatedAt: new Date(),
          lastUpdated: new Date(),
          certifications: data.certifications || undefined,
          facilitiesData: data.facilitiesData ? {
            energySource: data.facilitiesData.energySource || '',
            renewableEnergyPercentage: typeof data.facilitiesData.renewableEnergyPercentage === 'number' ? data.facilitiesData.renewableEnergyPercentage : undefined,
            wasteRecyclingPercentage: typeof data.facilitiesData.wasteRecyclingPercentage === 'number' ? data.facilitiesData.wasteRecyclingPercentage : undefined,
            waterTreatment: data.facilitiesData.waterTreatment || '',
            transportationMethods: Array.isArray(data.facilitiesData.transportationMethods) ? data.facilitiesData.transportationMethods : []
          } : undefined
        })
        .where(eq(companySustainabilityData.companyId, companyId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(companySustainabilityData)
        .values({ 
          ...data, 
          companyId,
          completionPercentage: 0
        } as any)
        .returning();
      return created;
    }
  }

  // Company footprint data operations
  async getCompanyFootprintData(companyId: number, scope?: number, dataType?: string): Promise<CompanyFootprintData[]> {
    let whereConditions = [eq(companyFootprintData.companyId, companyId)];
    
    if (scope) {
      whereConditions.push(eq(companyFootprintData.scope, scope));
    }
    
    if (dataType) {
      whereConditions.push(eq(companyFootprintData.dataType, dataType));
    }
    
    return await db
      .select()
      .from(companyFootprintData)
      .where(and(...whereConditions))
      .orderBy(desc(companyFootprintData.createdAt));
  }

  async createFootprintData(data: InsertCompanyFootprintData): Promise<CompanyFootprintData> {
    const [footprintData] = await db
      .insert(companyFootprintData)
      .values(data)
      .returning();
    return footprintData;
  }

  async updateFootprintData(id: number, data: Partial<InsertCompanyFootprintData>): Promise<CompanyFootprintData> {
    const [updated] = await db
      .update(companyFootprintData)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companyFootprintData.id, id))
      .returning();
    return updated;
  }

  async deleteFootprintData(id: number): Promise<void> {
    await db.delete(companyFootprintData).where(eq(companyFootprintData.id, id));
  }

  async clearFootprintData(companyId: number): Promise<void> {
    await db.delete(companyFootprintData).where(eq(companyFootprintData.companyId, companyId));
  }

  // Document upload operations
  async getDocumentsByCompany(companyId: number): Promise<UploadedDocument[]> {
    return await db
      .select()
      .from(uploadedDocuments)
      .where(eq(uploadedDocuments.companyId, companyId))
      .orderBy(desc(uploadedDocuments.createdAt));
  }

  async createDocument(document: InsertUploadedDocument): Promise<UploadedDocument> {
    const [newDocument] = await db
      .insert(uploadedDocuments)
      .values(document)
      .returning();
    return newDocument;
  }

  async updateDocument(id: number, updates: Partial<InsertUploadedDocument>): Promise<UploadedDocument> {
    const [document] = await db
      .update(uploadedDocuments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(uploadedDocuments.id, id))
      .returning();
    return document;
  }

  async getDocumentById(id: number): Promise<UploadedDocument | undefined> {
    const [document] = await db
      .select()
      .from(uploadedDocuments)
      .where(eq(uploadedDocuments.id, id));
    return document;
  }

  // OpenLCA Flow Mapping operations
  async getAllFlowMappings(): Promise<OlcaFlowMapping[]> {
    return await db
      .select()
      .from(olcaFlowMappings)
      .orderBy(desc(olcaFlowMappings.createdAt));
  }

  async createFlowMapping(mapping: InsertOlcaFlowMapping): Promise<OlcaFlowMapping> {
    const [newMapping] = await db
      .insert(olcaFlowMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async updateFlowMapping(id: number, updates: Partial<InsertOlcaFlowMapping>): Promise<OlcaFlowMapping> {
    const [mapping] = await db
      .update(olcaFlowMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(olcaFlowMappings.id, id))
      .returning();
    return mapping;
  }

  async getFlowMappingsByInput(inputName: string, inputType: string): Promise<OlcaFlowMapping[]> {
    return await db
      .select()
      .from(olcaFlowMappings)
      .where(and(
        eq(olcaFlowMappings.inputName, inputName),
        eq(olcaFlowMappings.inputType, inputType)
      ))
      .orderBy(desc(olcaFlowMappings.confidenceScore));
  }

  // OpenLCA Process Mapping operations
  async getAllProcessMappings(): Promise<OlcaProcessMapping[]> {
    return await db
      .select()
      .from(olcaProcessMappings)
      .orderBy(desc(olcaProcessMappings.createdAt));
  }

  async createProcessMapping(mapping: InsertOlcaProcessMapping): Promise<OlcaProcessMapping> {
    const [newMapping] = await db
      .insert(olcaProcessMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async updateProcessMapping(id: number, updates: Partial<InsertOlcaProcessMapping>): Promise<OlcaProcessMapping> {
    const [mapping] = await db
      .update(olcaProcessMappings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(olcaProcessMappings.id, id))
      .returning();
    return mapping;
  }

  async getProcessMappingsByName(processName: string): Promise<OlcaProcessMapping[]> {
    return await db
      .select()
      .from(olcaProcessMappings)
      .where(eq(olcaProcessMappings.processName, processName))
      .orderBy(desc(olcaProcessMappings.createdAt));
  }

  // LCA Calculation Job operations
  async createLcaCalculationJob(job: InsertLcaCalculationJob): Promise<LcaCalculationJob> {
    const [newJob] = await db
      .insert(lcaCalculationJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async updateLcaCalculationJob(id: number, updates: Partial<InsertLcaCalculationJob>): Promise<LcaCalculationJob> {
    const [job] = await db
      .update(lcaCalculationJobs)
      .set(updates)
      .where(eq(lcaCalculationJobs.id, id))
      .returning();
    return job;
  }

  async getLcaCalculationJobById(id: number): Promise<LcaCalculationJob | undefined> {
    const [job] = await db
      .select()
      .from(lcaCalculationJobs)
      .where(eq(lcaCalculationJobs.id, id));
    return job;
  }

  async getLcaCalculationJobsByProduct(productId: number): Promise<LcaCalculationJob[]> {
    return await db
      .select()
      .from(lcaCalculationJobs)
      .where(eq(lcaCalculationJobs.productId, productId))
      .orderBy(desc(lcaCalculationJobs.createdAt));
  }

  async getLcaCalculationJobByJobId(jobId: string): Promise<LcaCalculationJob | undefined> {
    const [job] = await db
      .select()
      .from(lcaCalculationJobs)
      .where(eq(lcaCalculationJobs.jobId, jobId));
    return job;
  }

  async updateLcaCalculationJobByJobId(jobId: string, updates: Partial<InsertLcaCalculationJob>): Promise<LcaCalculationJob | undefined> {
    const [updatedJob] = await db
      .update(lcaCalculationJobs)
      .set(updates)
      .where(eq(lcaCalculationJobs.jobId, jobId))
      .returning();
    return updatedJob;
  }

  // LCA Questionnaire operations
  async createLcaQuestionnaire(questionnaire: InsertLcaQuestionnaire): Promise<LcaQuestionnaire> {
    const [newQuestionnaire] = await db
      .insert(lcaQuestionnaires)
      .values(questionnaire)
      .returning();
    return newQuestionnaire;
  }

  async getLcaQuestionnaireById(id: string): Promise<LcaQuestionnaire | undefined> {
    const [questionnaire] = await db
      .select()
      .from(lcaQuestionnaires)
      .where(eq(lcaQuestionnaires.id, id));
    return questionnaire;
  }

  async getLcaQuestionnairesByProduct(productId: number): Promise<LcaQuestionnaire[]> {
    return await db
      .select()
      .from(lcaQuestionnaires)
      .where(eq(lcaQuestionnaires.productId, productId))
      .orderBy(desc(lcaQuestionnaires.createdAt));
  }

  async updateLcaQuestionnaire(id: string, updates: Partial<InsertLcaQuestionnaire>): Promise<LcaQuestionnaire> {
    const [questionnaire] = await db
      .update(lcaQuestionnaires)
      .set(updates)
      .where(eq(lcaQuestionnaires.id, id))
      .returning();
    return questionnaire;
  }

  // Uploaded Supplier LCA operations  
  async createUploadedSupplierLca(upload: InsertUploadedSupplierLca): Promise<UploadedSupplierLca> {
    const [newUpload] = await db
      .insert(uploadedSupplierLcas)
      .values(upload)
      .returning();
    return newUpload;
  }

  async getUploadedSupplierLcasByQuestionnaire(questionnaireId: string): Promise<UploadedSupplierLca[]> {
    return await db
      .select()
      .from(uploadedSupplierLcas)
      .where(eq(uploadedSupplierLcas.questionnaireId, questionnaireId))
      .orderBy(desc(uploadedSupplierLcas.createdAt));
  }

  // Company Goals operations
  async getGoalsByCompany(companyId: number): Promise<CompanyGoal[]> {
    return await db
      .select()
      .from(companyGoals)
      .where(eq(companyGoals.companyId, companyId))
      .orderBy(desc(companyGoals.createdAt));
  }

  async createGoal(goal: InsertCompanyGoal): Promise<CompanyGoal> {
    const [newGoal] = await db
      .insert(companyGoals)
      .values(goal)
      .returning();
    return newGoal;
  }

  async updateGoal(id: string, updates: Partial<InsertCompanyGoal>): Promise<CompanyGoal> {
    const [goal] = await db
      .update(companyGoals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(companyGoals.id, id))
      .returning();
    return goal;
  }

  // KPI methods (using companyGoals table as KPI storage)
  async createKPI(kpiData: {
    companyId: number;
    name: string;
    description?: string | null;
    target: number;
    current: number;
    unit: string;
    category: string;
    deadline?: string | null;
    status: string;
    trend: string;
    trendValue: number;
  }) {
    // Map KPI data to companyGoals schema
    const goalData = {
      companyId: kpiData.companyId,
      kpiName: kpiData.name,
      targetValue: kpiData.target.toString(),
      targetDate: kpiData.deadline || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default: 1 year from now
      startValue: kpiData.current.toString(),
    };

    const [newKpi] = await db
      .insert(companyGoals)
      .values(goalData)
      .returning();

    // Transform back to KPI format for response
    return {
      id: newKpi.id,
      name: newKpi.kpiName,
      target: parseFloat(newKpi.targetValue),
      current: parseFloat(newKpi.startValue),
      unit: kpiData.unit,
      category: kpiData.category,
      deadline: newKpi.targetDate,
      status: kpiData.status,
      trend: kpiData.trend,
      trendValue: kpiData.trendValue
    };
  }

  // Custom Reports operations
  async getReportsByCompanyCustom(companyId: number): Promise<CustomReport[]> {
    return await db
      .select()
      .from(customReports)
      .where(eq(customReports.companyId, companyId))
      .orderBy(desc(customReports.createdAt));
  }

  async createCustomReport(report: InsertCustomReport): Promise<CustomReport> {
    const [newReport] = await db
      .insert(customReports)
      .values(report)
      .returning();
    return newReport;
  }

  async updateCustomReport(id: string, updates: Partial<InsertCustomReport>): Promise<CustomReport> {
    const [report] = await db
      .update(customReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(customReports.id, id))
      .returning();
    return report;
  }

  // Production Facilities operations
  async getProductionFacilitiesByCompany(companyId: number): Promise<ProductionFacility[]> {
    const facilities = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.companyId, companyId))
      .orderBy(desc(productionFacilities.isPrimaryFacility), productionFacilities.facilityName);
    return facilities;
  }

  async getProductionFacilityById(id: number): Promise<ProductionFacility | undefined> {
    const [facility] = await db
      .select()
      .from(productionFacilities)
      .where(eq(productionFacilities.id, id));
    return facility;
  }

  async createProductionFacility(facility: InsertProductionFacility): Promise<ProductionFacility> {
    const [newFacility] = await db
      .insert(productionFacilities)
      .values({
        ...facility,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return newFacility;
  }

  async updateProductionFacility(id: number, updates: Partial<InsertProductionFacility>): Promise<ProductionFacility> {
    const [facility] = await db
      .update(productionFacilities)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(productionFacilities.id, id))
      .returning();
    return facility;
  }

  async deleteProductionFacility(id: number): Promise<void> {
    await db
      .delete(productionFacilities)
      .where(eq(productionFacilities.id, id));
  }

  // Product Facility Mapping operations
  async getProductFacilityMappings(productId?: number, facilityId?: number): Promise<ProductFacilityMapping[]> {
    let query = db.select().from(productFacilityMappings);
    
    if (productId && facilityId) {
      query = query.where(and(
        eq(productFacilityMappings.productId, productId),
        eq(productFacilityMappings.facilityId, facilityId)
      ));
    } else if (productId) {
      query = query.where(eq(productFacilityMappings.productId, productId));
    } else if (facilityId) {
      query = query.where(eq(productFacilityMappings.facilityId, facilityId));
    }
    
    return await query;
  }

  async createProductFacilityMapping(mapping: InsertProductFacilityMapping): Promise<ProductFacilityMapping> {
    const [newMapping] = await db
      .insert(productFacilityMappings)
      .values({
        ...mapping,
        createdAt: new Date(),
      })
      .returning();
    return newMapping;
  }

  async deleteProductFacilityMapping(id: number): Promise<void> {
    await db
      .delete(productFacilityMappings)
      .where(eq(productFacilityMappings.id, id));
  }
}

export const storage = new DatabaseStorage();
