import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage as dbStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertProductSchema, insertSupplierSchema, insertUploadedDocumentSchema, insertLcaQuestionnaireSchema } from "@shared/schema";
import { nanoid } from "nanoid";
import multer from "multer";
import { extractUtilityData, analyzeDocument } from "./anthropic";
import { lcaService, LCAJobManager } from "./lca";
import { PDFService } from "./pdfService";
import path from "path";
import fs from "fs";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// Configure multer for file uploads
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload images or PDF files.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await dbStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Company routes
  app.get('/api/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { 
        electricityConsumption, 
        gasConsumption, 
        waterConsumption, 
        wasteGenerated,
        ...companyData 
      } = req.body;
      
      // Check if company already exists
      let company = await dbStorage.getCompanyByOwner(userId);
      
      if (company) {
        // Update existing company
        company = await dbStorage.updateCompany(company.id, {
          ...companyData,
          onboardingComplete: true,
        });
      } else {
        // Create new company
        const validatedData = insertCompanySchema.parse({
          ...companyData,
          ownerId: userId,
        });
        company = await dbStorage.createCompany(validatedData);
      }
      
      // Create or update operational data if provided
      if (electricityConsumption || gasConsumption || waterConsumption || wasteGenerated) {
        await dbStorage.updateCompanyData(company.id, {
          electricityConsumption: electricityConsumption || 0,
          gasConsumption: gasConsumption || 0,
          waterConsumption: waterConsumption || 0,
          wasteGenerated: wasteGenerated || 0,
          reportingPeriodStart: company.currentReportingPeriodStart,
          reportingPeriodEnd: company.currentReportingPeriodEnd,
        });
      }
      
      res.json(company);
    } catch (error) {
      console.error("Error creating/updating company:", error);
      res.status(500).json({ message: "Failed to create/update company" });
    }
  });

  app.patch('/api/company/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const company = await dbStorage.updateCompany(parseInt(id), updates);
      res.json(company);
    } catch (error) {
      console.error("Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  // Product routes
  app.get('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const products = await dbStorage.getProductsByCompany(company.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      console.log('📦 Creating product...');
      const startTime = Date.now();
      
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      console.log('🔍 Starting validation...');
      const validationStart = Date.now();
      
      const validatedData = insertProductSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      
      const validationTime = Date.now() - validationStart;
      console.log(`✅ Validation completed in ${validationTime}ms`);
      
      const product = await dbStorage.createProduct(validatedData);
      
      const endTime = Date.now();
      console.log(`✅ Product created successfully in ${endTime - startTime}ms:`, product.name, 'ID:', product.id);
      
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.get('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const productId = parseInt(req.params.id);
      
      // Validate productId is a valid number
      if (isNaN(productId)) {
        console.error(`⚠️ Invalid product ID received in GET: "${req.params.id}"`);
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const product = await dbStorage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Verify the product belongs to the user's company
      if (product.companyId !== company.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching product:", error);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.patch('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const productId = parseInt(req.params.id);
      
      // Validate productId is a valid number
      if (isNaN(productId)) {
        console.error(`⚠️ Invalid product ID received in PATCH: "${req.params.id}"`);
        return res.status(400).json({ message: "Invalid product ID" });
      }
      
      const updates = req.body;
      
      console.log('🛠️ Server received PATCH request for product:', productId);
      console.log('📋 Update data received:', JSON.stringify(updates, null, 2));
      
      const product = await dbStorage.updateProduct(productId, updates);
      console.log('✅ Product updated successfully:', product.name);
      res.json(product);
    } catch (error) {
      console.error("Error updating product:", error);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.post('/api/products/:id/lca', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const productId = parseInt(req.params.id);
      const product = await dbStorage.getProductById(productId);
      
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Verify the product belongs to the user's company
      if (product.companyId !== company.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Start LCA calculation using the new service
      const result = await lcaService.calculateProductLCA(productId);
      
      res.json({
        message: "LCA calculation started successfully",
        jobId: result.jobId,
        estimatedDuration: result.estimatedDuration
      });
    } catch (error) {
      console.error("Error calculating LCA:", error);
      res.status(500).json({ message: "Failed to calculate LCA" });
    }
  });

  app.delete('/api/products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const productId = parseInt(req.params.id);
      await dbStorage.deleteProduct(productId);
      res.json({ message: "Product deleted successfully" });
    } catch (error) {
      console.error("Error deleting product:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const suppliers = await dbStorage.getSuppliersByCompany(company.id);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const portalToken = nanoid(32);
      const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const validatedData = insertSupplierSchema.parse({
        ...req.body,
        companyId: company.id,
        portalToken,
        tokenExpiresAt,
        status: 'invited',
      });
      
      const supplier = await dbStorage.createSupplier(validatedData);
      
      // TODO: Send email invitation with portal link
      // const portalLink = `${process.env.FRONTEND_URL}/supplier-portal/${portalToken}`;
      
      res.json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  // Report routes
  app.get('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const reports = await dbStorage.getReportsByCompany(company.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const report = await dbStorage.createReport({
        companyId: company.id,
        reportType: 'custom',
        reportingPeriodStart: company.currentReportingPeriodStart,
        reportingPeriodEnd: company.currentReportingPeriodEnd,
        status: 'generating',
      });
      
      // TODO: Trigger async LCA calculation with Celery
      // await triggerLCACalculation(report.id);
      
      res.json(report);
    } catch (error) {
      console.error("Error creating report:", error);
      res.status(500).json({ message: "Failed to create report" });
    }
  });

  // Verified supplier network routes
  app.get('/api/verified-suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const { category } = req.query;
      
      let suppliers;
      if (category) {
        suppliers = await dbStorage.getVerifiedSuppliersByCategory(category);
      } else {
        suppliers = await dbStorage.getVerifiedSuppliers();
      }
      
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching verified suppliers:", error);
      res.status(500).json({ message: "Failed to fetch verified suppliers" });
    }
  });

  app.get('/api/supplier-products', isAuthenticated, async (req: any, res) => {
    try {
      const { category, search, supplierId } = req.query;
      
      let products;
      if (supplierId) {
        products = await dbStorage.getSupplierProductsBySupplierId(supplierId as string);
      } else if (search) {
        products = await dbStorage.searchSupplierProducts(search as string, category as string);
      } else if (category) {
        products = await dbStorage.getSupplierProductsByCategory(category as string);
      } else {
        products = await dbStorage.getSupplierProducts();
      }
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  });

  app.get('/api/supplier-products/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // Log the received ID for debugging
      console.log('🔍 Received supplier product ID:', id, 'Type:', typeof id);
      
      // Check if ID is actually "[object Object]" string
      if (id === '[object Object]' || id === '[object%20Object]') {
        console.error('⚠️ Received [object Object] as ID - this indicates a frontend issue');
        return res.status(400).json({ 
          message: "Invalid product ID - received [object Object]. Please check frontend implementation." 
        });
      }
      
      // Validate UUID format
      if (!id || typeof id !== 'string' || !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return res.status(400).json({ message: "Invalid product ID format. Expected UUID." });
      }
      
      const product = await dbStorage.getSupplierProductById(id);
      
      if (!product) {
        return res.status(404).json({ message: "Supplier product not found" });
      }
      
      res.json(product);
    } catch (error) {
      console.error("Error fetching supplier product:", error);
      res.status(500).json({ message: "Failed to fetch supplier product" });
    }
  });

  // Admin routes for supplier management (restricted to admin users)
  app.post('/api/admin/verified-suppliers', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const supplier = await dbStorage.createVerifiedSupplier(req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error creating verified supplier:", error);
      res.status(500).json({ message: "Failed to create verified supplier" });
    }
  });

  app.put('/api/admin/verified-suppliers/:id', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const { id } = req.params;
      const supplier = await dbStorage.updateVerifiedSupplier(id, req.body);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating verified supplier:", error);
      res.status(500).json({ message: "Failed to update verified supplier" });
    }
  });

  app.post('/api/admin/supplier-products', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const product = await dbStorage.createSupplierProduct(req.body);
      res.json(product);
    } catch (error) {
      console.error("Error creating supplier product:", error);
      res.status(500).json({ message: "Failed to create supplier product" });
    }
  });

  app.put('/api/admin/supplier-products/:id', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const { id } = req.params;
      const product = await dbStorage.updateSupplierProduct(id, req.body);
      res.json(product);
    } catch (error) {
      console.error("Error updating supplier product:", error);
      res.status(500).json({ message: "Failed to update supplier product" });
    }
  });

  // Supplier portal routes (public)
  app.get('/api/supplier-portal/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const supplier = await dbStorage.getSupplierByToken(token);
      
      if (!supplier) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      if (supplier.tokenExpiresAt && supplier.tokenExpiresAt < new Date()) {
        return res.status(410).json({ message: "Token has expired" });
      }
      
      res.json({
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          supplierType: supplier.supplierType,
          status: supplier.status,
        }
      });
    } catch (error) {
      console.error("Error fetching supplier portal:", error);
      res.status(500).json({ message: "Failed to fetch supplier portal" });
    }
  });

  app.post('/api/supplier-portal/:token/submit', async (req, res) => {
    try {
      const { token } = req.params;
      const supplier = await dbStorage.getSupplierByToken(token);
      
      if (!supplier) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      if (supplier.tokenExpiresAt && supplier.tokenExpiresAt < new Date()) {
        return res.status(410).json({ message: "Token has expired" });
      }
      
      const updatedSupplier = await dbStorage.updateSupplier(supplier.id, {
        submittedData: req.body,
        submittedAt: new Date(),
        status: 'completed',
      });
      
      res.json({ message: "Data submitted successfully" });
    } catch (error) {
      console.error("Error submitting supplier data:", error);
      res.status(500).json({ message: "Failed to submit data" });
    }
  });

  // Stripe subscription routes
  app.post('/api/get-or-create-subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.stripeSubscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice as string, {
          expand: ['payment_intent']
        });

        res.json({
          subscriptionId: subscription.id,
          clientSecret: (invoice.payment_intent as any)?.client_secret,
        });
        return;
      }
      
      if (!user.email) {
        return res.status(400).json({ message: 'No user email on file' });
      }

      const customer = await stripe.customers.create({
        email: user.email,
        name: `${user.firstName} ${user.lastName}`.trim(),
      });

      user = await dbStorage.updateUserStripeInfo(user.id, customer.id, '');

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890abcdef',
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      await dbStorage.updateUserStripeInfo(user.id, customer.id, subscription.id);
  
      res.json({
        subscriptionId: subscription.id,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
      });
    } catch (error: any) {
      console.error("Stripe error:", error);
      return res.status(400).json({ error: { message: error.message } });
    }
  });

  // Dashboard metrics endpoint
  app.get('/api/dashboard/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const companyDataList = await dbStorage.getCompanyData(company.id);
      const latestData = companyDataList[0];
      
      // Calculate CO2e from energy consumption (simplified calculation)
      const electricityEmissions = (latestData?.electricityConsumption || 0) * 0.4; // kg CO2e per kWh
      const gasEmissions = (latestData?.gasConsumption || 0) * 2.0; // kg CO2e per cubic meter
      const totalCO2e = (electricityEmissions + gasEmissions) / 1000; // Convert to tonnes
      
      const metrics = {
        totalCO2e: totalCO2e,
        waterUsage: latestData?.waterConsumption || 0,
        wasteGenerated: latestData?.wasteGenerated || 0,
        energyConsumed: (latestData?.electricityConsumption || 0) + (latestData?.gasConsumption || 0),
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Document upload routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const documents = await dbStorage.getDocumentsByCompany(company.id);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents/upload', isAuthenticated, upload.single('document'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Create document record
      const document = await dbStorage.createDocument({
        companyId: company.id,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        uploadedBy: userId,
        processingStatus: 'processing',
      });

      // Process document asynchronously
      processDocumentAsync(document.id, req.file.path);

      res.json({ 
        message: "Document uploaded successfully",
        documentId: document.id,
        status: "processing"
      });
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const document = await dbStorage.getDocumentById(parseInt(id));
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.post('/api/documents/:id/apply-data', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const document = await dbStorage.getDocumentById(parseInt(id));
      
      if (!document || document.companyId !== company.id) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!document.extractedData) {
        return res.status(400).json({ message: "No extracted data available" });
      }

      // Apply extracted data to company data
      const extractedData = document.extractedData as any;
      const companyDataUpdate: any = {};

      if (extractedData.electricityConsumption) {
        companyDataUpdate.electricityConsumption = extractedData.electricityConsumption;
      }
      if (extractedData.gasConsumption) {
        companyDataUpdate.gasConsumption = extractedData.gasConsumption;
      }
      if (extractedData.waterConsumption) {
        companyDataUpdate.waterConsumption = extractedData.waterConsumption;
      }
      if (extractedData.wasteGenerated) {
        companyDataUpdate.wasteGenerated = extractedData.wasteGenerated;
      }

      if (Object.keys(companyDataUpdate).length > 0) {
        await dbStorage.updateCompanyData(company.id, companyDataUpdate);
      }

      res.json({ message: "Data applied successfully" });
    } catch (error) {
      console.error("Error applying document data:", error);
      res.status(500).json({ message: "Failed to apply document data" });
    }
  });

  // OpenLCA Integration Routes
  app.get('/api/lca/status', isAuthenticated, async (req: any, res) => {
    try {
      const status = await lcaService.getServiceStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting LCA service status:", error);
      res.status(500).json({ message: "Failed to get LCA service status" });
    }
  });

  app.post('/api/lca/calculate/:productId', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const { options } = req.body;
      
      const result = await lcaService.calculateProductLCA(parseInt(productId), options);
      res.json(result);
    } catch (error) {
      console.error("Error starting LCA calculation:", error);
      res.status(500).json({ message: "Failed to start LCA calculation" });
    }
  });

  app.get('/api/lca/calculation/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const status = await lcaService.getCalculationStatus(jobId);
      res.json(status);
    } catch (error) {
      console.error("Error getting LCA calculation status:", error);
      res.status(500).json({ message: "Failed to get calculation status" });
    }
  });

  app.delete('/api/lca/calculation/:jobId', isAuthenticated, async (req: any, res) => {
    try {
      const { jobId } = req.params;
      const success = await lcaService.cancelCalculation(jobId);
      res.json({ success });
    } catch (error) {
      console.error("Error cancelling LCA calculation:", error);
      res.status(500).json({ message: "Failed to cancel calculation" });
    }
  });

  app.get('/api/lca/product/:productId/history', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const history = await lcaService.getProductLCAHistory(parseInt(productId));
      res.json(history);
    } catch (error) {
      console.error("Error getting LCA history:", error);
      res.status(500).json({ message: "Failed to get LCA history" });
    }
  });

  app.get('/api/lca/product/:productId/validate', isAuthenticated, async (req: any, res) => {
    try {
      const { productId } = req.params;
      const validation = await lcaService.validateProductForLCA(parseInt(productId));
      res.json(validation);
    } catch (error) {
      console.error("Error validating product for LCA:", error);
      res.status(500).json({ message: "Failed to validate product" });
    }
  });

  app.get('/api/lca/impact-methods', isAuthenticated, async (req: any, res) => {
    try {
      const methods = await lcaService.getAvailableImpactMethods();
      res.json(methods);
    } catch (error) {
      console.error("Error getting impact methods:", error);
      res.status(500).json({ message: "Failed to get impact methods" });
    }
  });

  app.get('/api/lca/flows/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query, flowType } = req.query;
      const flows = await lcaService.searchFlows(query as string, flowType as string);
      res.json(flows);
    } catch (error) {
      console.error("Error searching flows:", error);
      res.status(500).json({ message: "Failed to search flows" });
    }
  });

  app.get('/api/lca/processes/search', isAuthenticated, async (req: any, res) => {
    try {
      const { query, processType } = req.query;
      const processes = await lcaService.searchProcesses(query as string, processType as string);
      res.json(processes);
    } catch (error) {
      console.error("Error searching processes:", error);
      res.status(500).json({ message: "Failed to search processes" });
    }
  });

  app.get('/api/lca/queue/stats', isAuthenticated, async (req: any, res) => {
    try {
      const stats = await LCAJobManager.getQueueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting queue stats:", error);
      res.status(500).json({ message: "Failed to get queue stats" });
    }
  });

  // PDF download route for LCA reports
  app.get('/api/lca/product/:productId/download-pdf', isAuthenticated, async (req: any, res) => {
    try {
      const productId = parseInt(req.params.productId);
      const userId = req.user.claims.sub;
      
      // Get product data
      const product = await dbStorage.getProduct(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      
      // Get company data
      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      // Verify user owns this product
      if (product.companyId !== company.id) {
        return res.status(403).json({ message: "Unauthorized access to product" });
      }
      
      // Get latest LCA results for this product
      const lcaHistory = await lcaService.getProductLCAHistory(productId);
      const latestLCA = lcaHistory[0];
      
      if (!latestLCA || !latestLCA.results) {
        return res.status(404).json({ message: "No LCA results found for this product" });
      }
      
      // Get operational data
      const companyDataList = await dbStorage.getCompanyData(company.id);
      const operationalData = companyDataList[0] || {};
      
      // Prepare data for PDF generation
      const pdfData = {
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku || `SKU-${product.id}`,
          volume: product.volume || '750ml',
          annualProductionVolume: product.annualProductionVolume || 0,
          productionUnit: product.productionUnit || 'units',
          bottleWeight: product.bottleWeight || 0,
          labelWeight: product.labelWeight || 0,
          bottleMaterial: product.bottleMaterial || 'Glass',
          labelMaterial: product.labelMaterial || 'Paper',
        },
        company: {
          name: company.name,
          industry: company.industry,
          size: company.size,
          address: company.address,
          country: company.country,
          website: company.website,
          reportingPeriodStart: company.currentReportingPeriodStart?.toISOString() || new Date().toISOString(),
          reportingPeriodEnd: company.currentReportingPeriodEnd?.toISOString() || new Date().toISOString(),
        },
        lcaResults: {
          totalCarbonFootprint: latestLCA.results.totalCarbonFootprint || 0,
          totalWaterFootprint: latestLCA.results.totalWaterFootprint || 0,
          impactsByCategory: latestLCA.results.impactsByCategory || [],
          calculationDate: latestLCA.results.calculationDate || latestLCA.createdAt?.toISOString() || new Date().toISOString(),
          systemName: latestLCA.olcaSystemName || 'LCA System',
          systemId: latestLCA.olcaSystemId || 'system-001',
        },
        operationalData: {
          electricityConsumption: operationalData.electricityConsumption || 0,
          gasConsumption: operationalData.gasConsumption || 0,
          waterConsumption: operationalData.waterConsumption || 0,
          wasteGenerated: operationalData.wasteGenerated || 0,
        }
      };
      
      // Generate PDF
      const pdfBuffer = await PDFService.generateLCAPDF(pdfData);
      
      // Set response headers for PDF download
      const filename = `LCA_Report_${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      // Send PDF
      res.send(pdfBuffer);
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  });

  // LCA Questionnaire routes
  app.get('/api/lca-questionnaires', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const productId = req.query.productId ? parseInt(req.query.productId) : null;
      if (!productId) {
        return res.status(400).json({ message: "Product ID required" });
      }

      const questionnaires = await dbStorage.getLcaQuestionnairesByProduct(productId);
      res.json(questionnaires);
    } catch (error) {
      console.error("Error fetching LCA questionnaires:", error);
      res.status(500).json({ message: "Failed to fetch LCA questionnaires" });
    }
  });

  app.post('/api/lca-questionnaires', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const validationResult = insertLcaQuestionnaireSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid LCA data", 
          errors: validationResult.error.errors 
        });
      }

      const questionnaire = await dbStorage.createLcaQuestionnaire(validationResult.data);
      res.status(201).json(questionnaire);
    } catch (error) {
      console.error("Error creating LCA questionnaire:", error);
      res.status(500).json({ message: "Failed to create LCA questionnaire" });
    }
  });

  app.put('/api/lca-questionnaires/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      const questionnaireId = req.params.id;
      const validationResult = insertLcaQuestionnaireSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid LCA data", 
          errors: validationResult.error.errors 
        });
      }

      const questionnaire = await dbStorage.updateLcaQuestionnaire(questionnaireId, validationResult.data);
      res.json(questionnaire);
    } catch (error) {
      console.error("Error updating LCA questionnaire:", error);
      res.status(500).json({ message: "Failed to update LCA questionnaire" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Async function to process document OCR
async function processDocumentAsync(documentId: number, filePath: string) {
  try {
    // Read file and convert to base64
    const fileBuffer = fs.readFileSync(filePath);
    const base64Image = fileBuffer.toString('base64');

    // Analyze document first
    const analysis = await analyzeDocument(base64Image);
    
    // Extract utility data
    const extractedData = await extractUtilityData(base64Image);

    // Update document with extracted data
    await dbStorage.updateDocument(documentId, {
      extractedData: extractedData,
      confidence: extractedData.confidence,
      documentType: analysis.documentType,
      processingStatus: 'completed'
    });

    // Clean up uploaded file
    fs.unlinkSync(filePath);
  } catch (error) {
    console.error("Error processing document:", error);
    await dbStorage.updateDocument(documentId, {
      processingStatus: 'failed',
      processingError: error.message
    });
  }
}
