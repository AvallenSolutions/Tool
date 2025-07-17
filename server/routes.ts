import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertProductSchema, insertSupplierSchema } from "@shared/schema";
import { nanoid } from "nanoid";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
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
      const company = await storage.getCompanyByOwner(userId);
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.post('/api/company', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertCompanySchema.parse({
        ...req.body,
        ownerId: userId,
      });
      
      const company = await storage.createCompany(validatedData);
      res.json(company);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.patch('/api/company/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const company = await storage.updateCompany(parseInt(id), updates);
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
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const products = await storage.getProductsByCompany(company.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post('/api/products', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const validatedData = insertProductSchema.parse({
        ...req.body,
        companyId: company.id,
      });
      
      const product = await storage.createProduct(validatedData);
      res.json(product);
    } catch (error) {
      console.error("Error creating product:", error);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Supplier routes
  app.get('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const suppliers = await storage.getSuppliersByCompany(company.id);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post('/api/suppliers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByOwner(userId);
      
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
      
      const supplier = await storage.createSupplier(validatedData);
      
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
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const reports = await storage.getReportsByCompany(company.id);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching reports:", error);
      res.status(500).json({ message: "Failed to fetch reports" });
    }
  });

  app.post('/api/reports', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const report = await storage.createReport({
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

  // Supplier portal routes (public)
  app.get('/api/supplier-portal/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const supplier = await storage.getSupplierByToken(token);
      
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
      const supplier = await storage.getSupplierByToken(token);
      
      if (!supplier) {
        return res.status(404).json({ message: "Invalid or expired token" });
      }
      
      if (supplier.tokenExpiresAt && supplier.tokenExpiresAt < new Date()) {
        return res.status(410).json({ message: "Token has expired" });
      }
      
      const updatedSupplier = await storage.updateSupplier(supplier.id, {
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
      let user = await storage.getUser(userId);
      
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

      user = await storage.updateUserStripeInfo(user.id, customer.id, '');

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{
          price: process.env.STRIPE_PRICE_ID || 'price_1234567890abcdef',
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      await storage.updateUserStripeInfo(user.id, customer.id, subscription.id);
  
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
      const company = await storage.getCompanyByOwner(userId);
      
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      
      const companyData = await storage.getCompanyData(company.id);
      const reports = await storage.getReportsByCompany(company.id);
      
      // Calculate aggregated metrics
      const latestReport = reports[0];
      const metrics = {
        totalCO2e: latestReport?.totalScope1 || 0 + latestReport?.totalScope2 || 0 + latestReport?.totalScope3 || 0,
        waterUsage: latestReport?.totalWaterUsage || 0,
        wasteGenerated: latestReport?.totalWasteGenerated || 0,
        scope1: latestReport?.totalScope1 || 0,
        scope2: latestReport?.totalScope2 || 0,
        scope3: latestReport?.totalScope3 || 0,
      };
      
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
