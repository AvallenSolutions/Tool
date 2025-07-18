import {
  users,
  companies,
  products,
  suppliers,
  reports,
  companyData,
  productInputs,
  uploadedDocuments,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Product,
  type InsertProduct,
  type Supplier,
  type InsertSupplier,
  type Report,
  type InsertReport,
  type UploadedDocument,
  type InsertUploadedDocument,
  type CompanyData,
  type ProductInput,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserStripeInfo(id: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User>;
  
  // Company operations
  getCompanyByOwner(ownerId: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, updates: Partial<InsertCompany>): Promise<Company>;
  
  // Product operations
  getProductsByCompany(companyId: number): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;
  
  // Supplier operations
  getSuppliersByCompany(companyId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, updates: Partial<InsertSupplier>): Promise<Supplier>;
  getSupplierByToken(token: string): Promise<Supplier | undefined>;
  
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
      .where(eq(companies.ownerId, ownerId));
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
}

export const storage = new DatabaseStorage();
