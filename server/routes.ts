import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import passport from "passport";
import { storage as dbStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertProductSchema, insertSupplierSchema, insertUploadedDocumentSchema, insertLcaQuestionnaireSchema, companies, reports, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import multer from "multer";
import { extractUtilityData, analyzeDocument } from "./anthropic";
import { lcaService, LCAJobManager } from "./lca";
import { PDFService } from "./pdfService";
import { WebScrapingService } from "./services/WebScrapingService";
import { PDFExtractionService } from "./services/PDFExtractionService";
import { adminRouter } from "./routes/admin";
import { SupplierProductService } from "./services/SupplierProductService";
import { BulkImportService } from "./services/BulkImportService";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-11-20.acacia",
});

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Configure multer for image uploads specifically
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads/images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageUpload = multer({ 
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5 // Max 5 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Authentication routes
  setupAuth(app);

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth user endpoint - must come BEFORE greenwash guardian routes
  app.get('/api/auth/user', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = req.user as any;
      // Get user role from database
      const userId = user.claims?.sub;
      let userRole = 'user';
      
      if (userId) {
        try {
          const [dbUser] = await db
            .select({ role: users.role })
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);
          
          if (dbUser) {
            userRole = dbUser.role;
          }
        } catch (error) {
          console.error('Error fetching user role:', error);
        }
      }

      const userInfo = {
        id: userId,
        email: user.claims?.email,
        firstName: user.claims?.first_name,
        lastName: user.claims?.last_name,
        profileImageUrl: user.claims?.profile_image_url,
        role: userRole,
      };
      
      return res.json(userInfo);
    } catch (error) {
      console.error('Auth endpoint error:', error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  // GreenwashGuardian API Routes - AI-powered analysis
  app.post('/api/greenwash-guardian/analyze', async (req, res) => {
    try {
      const { type, content } = req.body;

      if (!type || !content || !['website', 'text'].includes(type)) {
        return res.status(400).json({ 
          error: 'Valid type (website or text) and content are required' 
        });
      }

      
      
      
      let analysisContent = content;
      
      // If analyzing a website, scrape the content first
      if (type === 'website' && content.includes('.')) {
        try {
          // Add protocol if missing
          const url = content.startsWith('http') ? content : `https://${content}`;
          
          
          const response = await fetch(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            const cheerio = await import('cheerio');
            const $ = cheerio.load(html);
            
            // Remove script and style elements
            $('script, style, nav, footer, .navigation, .menu').remove();
            
            // Extract main content text
            const textContent = $('body').text()
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 10000); // Limit to 10k chars for analysis
            
            if (textContent.length > 100) {
              analysisContent = textContent;
              
            } else {
              
            }
          } else {
            
          }
        } catch (error) {
          
        }
      }
      
      // AI-powered analysis using Anthropic API
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });

      const prompt = `You are an expert in the UK Digital Markets, Competition and Consumers Act 2024 (DMCC Act 2024) compliance, specifically analyzing environmental and sustainability claims for greenwashing violations.

Analyze the following ${type} content for DMCC Act 2024 compliance violations:

"""
${analysisContent}
"""

Extract specific environmental claims and provide detailed analysis. For each claim found, provide:

1. EXACT QUOTE: Extract the complete sentence containing the environmental claim
2. RISK LEVEL: Assign GREEN (compliant), AMBER (warning), or RED (critical) 
3. VIOLATION RISK: Percentage (0-100%)
4. ISSUE: Specific problem with the claim
5. SUGGESTED EDIT: Actionable recommendation
6. DMCC SECTION: Relevant DMCC Act section reference

Respond in this exact JSON format:
{
  "score": 0-100,
  "status": "compliant|warning|non-compliant", 
  "issues": [
    {
      "type": "compliant|warning|critical",
      "category": "category name",
      "claim": "exact quote from content",
      "description": "specific issue description",
      "solution": "actionable recommendation", 
      "violationRisk": 0-100,
      "dmccSection": "DMCC section reference"
    }
  ],
  "recommendations": ["overall recommendations"],
  "analysisDetails": {
    "contentType": "${type}",
    "totalClaims": 0,
    "highRiskIssues": 0,
    "substantiationLevel": "Low|Moderate|High",
    "dmccCompliance": "Compliant|Needs Attention|Non-Compliant"
  }
}

Key focus areas:
- Vague terms (sustainable, eco-friendly, green, natural) - quote the exact sentence
- Unsubstantiated claims (carbon neutral, climate positive) - quote the full claim
- Missing evidence or third-party verification
- Comparative claims without proper baselines - quote the comparison
- Specific measurable claims (quote them exactly and mark as compliant if well-substantiated)

Be precise and quote actual text from the content, not generic terms.`;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Extract JSON from AI response - handle markdown code blocks
      let cleanedJson = responseText;
      
      // Remove all markdown code block markers
      cleanedJson = cleanedJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      // Extract JSON object by finding the first { and last }
      const jsonStart = cleanedJson.indexOf('{');
      const jsonEnd = cleanedJson.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedJson = cleanedJson.substring(jsonStart, jsonEnd + 1);
      }
      
      
      
      let result;
      try {
        result = JSON.parse(cleanedJson);
      } catch (parseError) {
        console.error('JSON parse failed, trying alternative approach:', parseError.message);
        
        // Fallback: try to find valid JSON more aggressively
        const jsonMatches = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatches && jsonMatches[0]) {
          try {
            result = JSON.parse(jsonMatches[0]);
          } catch (secondError) {
            console.error('Secondary JSON parse also failed:', secondError.message);
            throw new Error('Could not parse AI response as JSON');
          }
        } else {
          throw new Error('No valid JSON found in AI response');
        }
      }
      
      // Validate and enhance the AI result
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid AI response structure');
      }
      
      // Ensure required fields exist
      result.score = result.score || 50;
      result.status = result.status || 'warning';
      result.issues = result.issues || [];
      result.recommendations = result.recommendations || [];
      result.analysisDetails = result.analysisDetails || {
        contentType: type,
        totalClaims: 0,
        highRiskIssues: 0,
        substantiationLevel: 'Low',
        dmccCompliance: 'Needs Review'
      };

      
      
      
      
      res.json(result);
    } catch (error) {
      console.error('GreenwashGuardian AI analysis error:', error);
      
      // Fallback response with error indication
      res.status(500).json({
        score: 50,
        status: 'warning',
        issues: [{
          type: 'warning',
          category: 'Analysis Error',
          claim: 'Unable to complete AI analysis',
          description: 'AI analysis service temporarily unavailable',
          solution: 'Please try again or provide text content directly',
          violationRisk: 50,
          dmccSection: 'General Compliance'
        }],
        recommendations: ['Please try again later or ensure valid content is provided'],
        analysisDetails: {
          contentType: 'error',
          totalClaims: 1,
          highRiskIssues: 0,
          substantiationLevel: 'Low',
          dmccCompliance: 'Needs Review'
        },
        error: 'AI analysis service error'
      });
    }
  });

  // Web Scraping Routes
  app.post('/api/suppliers/scrape-product', async (req, res) => {
    try {
      const { url } = req.body;

      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: 'URL is required and must be a string' 
        });
      }

      
      const result = await WebScrapingService.scrapeProductData(url);

      if (result.success) {
        
        res.json({
          success: true,
          productData: result.productData,
          supplierData: result.supplierData,
          extractedFields: result.extractedFields,
          totalFields: result.totalFields,
          extractionRate: `${Math.round((result.extractedFields.length / result.totalFields) * 100)}%`,
          images: result.images || []
        });
      } else {
        
        res.status(400).json({
          success: false,
          error: result.error,
          extractedFields: result.extractedFields,
          totalFields: result.totalFields
        });
      }
    } catch (error) {
      console.error('Error in scrape-product endpoint:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred during web scraping' 
      });
    }
  });

  // LCA Document Upload Route
  app.post('/api/upload-lca-document', imageUpload.single('lcaDocument'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          error: 'No LCA document uploaded' 
        });
      }

      // Validate file type (PDF, DOC, DOCX)
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ 
          success: false,
          error: 'Invalid file type. Only PDF, DOC, and DOCX files are allowed.' 
        });
      }

      // Generate public URL for the document
      const documentPath = `/uploads/images/${req.file.filename}`;
      
      res.json({
        success: true,
        documentPath: documentPath,
        originalName: req.file.originalname,
        size: req.file.size
      });
    } catch (error) {
      console.error('Error uploading LCA document:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred during file upload' 
      });
    }
  });

  // Image Upload Routes
  app.post('/api/suppliers/upload-images', imageUpload.array('images', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'No images uploaded' 
        });
      }

      
      
      const imageUrls: string[] = [];
      for (const file of req.files) {
        // Generate public URL for the image
        const imageUrl = `/uploads/images/${file.filename}`;
        imageUrls.push(imageUrl);
        
      }

      res.json({
        success: true,
        message: `${imageUrls.length} images uploaded successfully`,
        imageUrls: imageUrls
      });
    } catch (error) {
      console.error('Error in upload-images endpoint:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred during image upload' 
      });
    }
  });

  // Serve uploaded images statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Enhanced Supplier Product Creation with Deduplication
  app.post('/api/supplier-products/enhanced', async (req, res) => {
    try {
      const { supplierData, productData, selectedImages } = req.body;

      
      
      
      

      if (!supplierData && !productData) {
        return res.status(400).json({ 
          success: false,
          error: 'Either supplier data or product data is required' 
        });
      }

      // Import the service
      const { SupplierProductService } = await import('./services/SupplierProductService');

      const result = await SupplierProductService.createSupplierProduct({
        supplierData: supplierData || {},
        productData: productData || {},
        selectedImages: selectedImages || []
      });

      
      

      res.json({
        success: true,
        data: {
          supplierId: result.supplierId,
          productId: result.productId,
          isNewSupplier: result.isNewSupplier,
          message: result.isNewSupplier 
            ? 'New supplier and product created successfully'
            : 'Product added to existing supplier'
        }
      });

    } catch (error) {
      console.error('Error in enhanced supplier-products creation:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred during supplier product creation' 
      });
    }
  });

  // Bulk Import endpoint for advanced multi-page scraping
  app.post('/api/suppliers/bulk-import', async (req, res) => {
    try {
      const { catalogUrl } = req.body;

      if (!catalogUrl || typeof catalogUrl !== 'string') {
        return res.status(400).json({ 
          success: false,
          error: 'Catalog URL is required and must be a string' 
        });
      }

      
      
      const bulkImportService = new BulkImportService();
      const result = await bulkImportService.processCatalogPage(catalogUrl);

      

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      console.error('Error in bulk-import endpoint:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred during bulk import',
        suppliersCreated: 0,
        productsCreated: 0,
        pdfsProcessed: 0,
        linksScraped: 0,
        errors: [error.message],
        results: []
      });
    }
  });

  // Supplier editing endpoints for Super Admin
  app.put('/api/admin/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      if (!id) {
        return res.status(400).json({ 
          success: false,
          error: 'Supplier ID is required' 
        });
      }

      

      // Update supplier in database
      const { verifiedSuppliers } = await import('@shared/schema');
      const updatedSupplier = await db
        .update(verifiedSuppliers)
        .set({ 
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(verifiedSuppliers.id, id))
        .returning();

      if (updatedSupplier.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Supplier not found' 
        });
      }

      

      res.json({
        success: true,
        data: updatedSupplier[0],
        message: 'Supplier updated successfully'
      });

    } catch (error) {
      console.error('Error updating supplier:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred while updating supplier' 
      });
    }
  });

  // Get all supplier products for admin management  
  app.get('/api/admin/supplier-products', async (req, res) => {
    try {
      const { verifiedSuppliers, supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const products = await db
        .select({
          id: supplierProducts.id,
          supplierId: supplierProducts.supplierId,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          productAttributes: supplierProducts.productAttributes,
          basePrice: supplierProducts.basePrice,
          currency: supplierProducts.currency,
          minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
          leadTimeDays: supplierProducts.leadTimeDays,
          certifications: supplierProducts.certifications,
          isVerified: supplierProducts.isVerified,
          createdAt: supplierProducts.createdAt,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory
        })
        .from(supplierProducts)
        .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id));
      
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching admin supplier products:", error);
      res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  });

  // Edit supplier product endpoint
  app.put('/api/admin/supplier-products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      

      const { supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const updatedProduct = await db
        .update(supplierProducts)
        .set({ 
          ...updateData,
          updatedAt: new Date().toISOString()
        })
        .where(eq(supplierProducts.id, id))
        .returning();

      if (updatedProduct.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Product not found' 
        });
      }

      

      res.json({
        success: true,
        data: updatedProduct[0],
        message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('Error updating supplier product:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred while updating product' 
      });
    }
  });

  // Get all suppliers for admin management
  app.get('/api/admin/suppliers', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const suppliers = await db.select().from(verifiedSuppliers);

      res.json({
        success: true,
        data: suppliers
      });

    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ 
        success: false,
        error: 'Internal server error occurred while fetching suppliers' 
      });
    }
  });

  // Public suppliers route (for supplier onboarding page)
  app.get('/api/suppliers', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const suppliers = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.isVerified, true));

      res.json(suppliers);

    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ 
        error: 'Internal server error occurred while fetching suppliers' 
      });
    }
  });

  // Get single supplier product
  app.get('/api/supplier-products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedSuppliers, supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const product = await db
        .select({
          id: supplierProducts.id,
          supplierId: supplierProducts.supplierId,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          productAttributes: supplierProducts.productAttributes,
          basePrice: supplierProducts.basePrice,
          currency: supplierProducts.currency,
          minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
          leadTimeDays: supplierProducts.leadTimeDays,
          certifications: supplierProducts.certifications,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          isVerified: supplierProducts.isVerified,
          createdAt: supplierProducts.createdAt
        })
        .from(supplierProducts)
        .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
        .where(eq(supplierProducts.id, id))
        .limit(1);

      if (product.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product[0]);
    } catch (error) {
      console.error('❌ Error fetching supplier product:', error);
      res.status(500).json({ error: 'Failed to fetch supplier product' });
    }
  });

  // Get single supplier
  app.get('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedSuppliers } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const supplier = await db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.id, id))
        .limit(1);

      if (supplier.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      res.json(supplier[0]);
    } catch (error) {
      console.error('❌ Error fetching supplier:', error);
      res.status(500).json({ error: 'Failed to fetch supplier' });
    }
  });

  // Update supplier
  app.put('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const { verifiedSuppliers } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const result = await db
        .update(verifiedSuppliers)
        .set(updateData)
        .where(eq(verifiedSuppliers.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('❌ Error updating supplier:', error);
      res.status(500).json({ error: 'Failed to update supplier' });
    }
  });

  // Delete supplier
  app.delete('/api/suppliers/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { verifiedSuppliers, supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      // First delete all products from this supplier
      await db
        .delete(supplierProducts)
        .where(eq(supplierProducts.supplierId, id));
      
      // Then delete the supplier
      const result = await db
        .delete(verifiedSuppliers)
        .where(eq(verifiedSuppliers.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Supplier not found' });
      }

      res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting supplier:', error);
      res.status(500).json({ error: 'Failed to delete supplier' });
    }
  });

  // Delete supplier product
  app.delete('/api/supplier-products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const result = await db
        .delete(supplierProducts)
        .where(eq(supplierProducts.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error('❌ Error deleting supplier product:', error);
      res.status(500).json({ error: 'Failed to delete supplier product' });
    }
  });

  // Supplier Products API for Supplier Network
  app.get('/api/supplier-products', async (req, res) => {
    try {
      const { category, search } = req.query;
      const { verifiedSuppliers, supplierProducts } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      let query = db
        .select({
          id: supplierProducts.id,
          supplierId: supplierProducts.supplierId,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          productAttributes: supplierProducts.productAttributes,
          basePrice: supplierProducts.basePrice,
          currency: supplierProducts.currency,
          minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
          leadTimeDays: supplierProducts.leadTimeDays,
          certifications: supplierProducts.certifications,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory
        })
        .from(supplierProducts)
        .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
        .where(and(
          eq(supplierProducts.isVerified, true),
          eq(verifiedSuppliers.isVerified, true)
        ));
        
      // Apply filters based on query parameters
      const conditions = [
        eq(supplierProducts.isVerified, true),
        eq(verifiedSuppliers.isVerified, true)
      ];
      
      if (req.query.supplier) {
        conditions.push(eq(supplierProducts.supplierId, req.query.supplier as string));
      }
        
      if (category) {
        conditions.push(eq(verifiedSuppliers.supplierCategory, category as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const products = await query;
      
      res.json(products);
    } catch (error) {
      console.error("Error fetching supplier products:", error);
      res.status(500).json({ message: "Failed to fetch supplier products" });
    }
  });

  // Verified Suppliers API endpoints
  app.get('/api/verified-suppliers', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const category = req.query.category as string;
      
      let query = db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.isVerified, true));
        
      if (category) {
        query = query.where(and(
          eq(verifiedSuppliers.isVerified, true),
          eq(verifiedSuppliers.supplierCategory, category)
        ));
      }
      
      const suppliers = await query.orderBy(verifiedSuppliers.supplierName);

      res.json(suppliers);
    } catch (error) {
      console.error('Error fetching verified suppliers:', error);
      res.status(500).json({ error: 'Failed to fetch verified suppliers' });
    }
  });

  app.post('/api/verified-suppliers', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const supplierData = {
        supplierName: req.body.supplierName,
        supplierCategory: req.body.supplierCategory,
        description: req.body.description || null,
        website: req.body.website || null,
        contactEmail: req.body.contactEmail || null,
        addressStreet: req.body.addressLine1,
        addressCity: req.body.city,
        addressPostalCode: req.body.postalCode,
        addressCountry: req.body.addressCountry,
        verificationStatus: req.body.verificationStatus || 'pending_review',
        submittedBy: 'CLIENT',
        isVerified: req.body.verificationStatus === 'verified' ? true : false
      };

      const [newSupplier] = await db
        .insert(verifiedSuppliers)
        .values(supplierData)
        .returning();

      res.json(newSupplier);
    } catch (error) {
      console.error('Error creating verified supplier:', error);
      res.status(500).json({ error: 'Failed to create verified supplier' });
    }
  });

  // Supplier Product endpoints
  app.get('/api/supplier-products', async (req, res) => {
    try {
      const { supplierProducts, verifiedSuppliers } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const category = req.query.category as string;
      const supplierId = req.query.supplier as string;
      
      const query = db
        .select({
          id: supplierProducts.id,
          name: supplierProducts.productName,
          sku: supplierProducts.sku,
          description: supplierProducts.productDescription,
          productAttributes: supplierProducts.productAttributes,
          supplierId: supplierProducts.supplierId,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          isVerified: supplierProducts.isVerified,
          createdAt: supplierProducts.createdAt
        })
        .from(supplierProducts)
        .leftJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id));

      // Apply filters based on query parameters
      const conditions = [
        eq(supplierProducts.isVerified, true),
        eq(verifiedSuppliers.isVerified, true)
      ];
      
      if (supplierId) {
        conditions.push(eq(supplierProducts.supplierId, supplierId));
      }
        
      if (category) {
        conditions.push(eq(verifiedSuppliers.supplierCategory, category as string));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const products = await query;
      res.json(products);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      res.status(500).json({ error: 'Failed to fetch supplier products' });
    }
  });

  app.post('/api/supplier-products', async (req, res) => {
    try {
      const { supplierProducts } = await import('@shared/schema');
      
      const productData = {
        productName: req.body.name,
        productDescription: req.body.description || null,
        sku: req.body.sku || `SKU-${Date.now()}`,
        supplierId: req.body.supplierId,
        submittedBy: 'CLIENT',
        isVerified: true, // Auto-approve for now
        productAttributes: {
          type: req.body.type,
          material: req.body.material || null,
          weight: req.body.weight || null,
          recycledContent: req.body.recycledContent || null,
          co2Emissions: req.body.co2Emissions || null,
          lcaDocumentPath: req.body.lcaDocumentPath || null,
          certifications: req.body.certifications || null,
          unit: req.body.unit || null,
          measurement: req.body.measurement || null,
          volume: req.body.volume || null,
          imageUrls: req.body.imageUrls || []
        }
      };

      const [newProduct] = await db
        .insert(supplierProducts)
        .values(productData)
        .returning();

      res.json(newProduct);
    } catch (error) {
      console.error('Error creating supplier product:', error);
      res.status(500).json({ error: 'Failed to create supplier product' });
    }
  });

  // Main product creation endpoint (Enhanced Product Form)
  // GET products endpoint
  app.get('/api/products', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const companyId = req.session?.user?.companyId || 1; // Fallback for development
      
      const results = await db.select().from(products).where(eq(products.companyId, companyId));
      console.log('Products fetched:', results.length, 'for company', companyId);
      res.json(results);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      
      // Helper function to convert boolean fields
      const convertBoolean = (value: any) => {
        if (value === '' || value === null || value === undefined) return false;
        return Boolean(value);
      };

      const productData = {
        companyId: 1, // TODO: Get from authenticated session
        ...req.body,
        status: req.body.status || 'active',
        // Convert all boolean fields properly
        isMainProduct: convertBoolean(req.body.isMainProduct),
        hasBuiltInClosure: convertBoolean(req.body.hasBuiltInClosure),
        hasSecondaryPackaging: convertBoolean(req.body.hasSecondaryPackaging),
        wasteWaterTreatment: convertBoolean(req.body.wasteWaterTreatment),
        coldChainRequired: convertBoolean(req.body.coldChainRequired),
        returnableContainer: convertBoolean(req.body.returnableContainer),
        // consumerEducation is now a text field, no conversion needed
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Creating product with data:', productData);

      const [newProduct] = await db.insert(products).values(productData).returning();
      console.log('Product created successfully:', newProduct);
      
      res.json(newProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product', details: error.message });
    }
  });

  // GET individual product endpoint
  app.get('/api/products/:id', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const productId = parseInt(req.params.id);
      
      const product = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      
      if (product.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product[0]);
    } catch (error) {
      console.error('Error fetching product:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  // DELETE product endpoint
  app.delete('/api/products/:id', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const productId = parseInt(req.params.id);
      
      const deletedProduct = await db.delete(products).where(eq(products.id, productId)).returning();
      
      if (deletedProduct.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json({ message: 'Product deleted successfully', id: productId });
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  // Update existing product endpoint
  app.patch('/api/products/:id', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const productId = parseInt(req.params.id);
      
      const updateData = {
        ...req.body,
        updatedAt: new Date()
      };

      console.log('Updating product:', productId, 'with data:', updateData);

      const [updatedProduct] = await db
        .update(products)
        .set(updateData)
        .where(eq(products.id, productId))
        .returning();

      if (!updatedProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      console.log('Product updated successfully:', updatedProduct);
      res.json(updatedProduct);
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ error: 'Failed to update product', details: error.message });
    }
  });

  // Draft product endpoint
  app.post('/api/products/draft', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      
      const draftData = {
        companyId: 1, // TODO: Get from session
        ...req.body,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const [product] = await db.insert(products).values(draftData).returning();
      res.json(product);
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({ error: 'Failed to save draft' });
    }
  });

  // Client Products API endpoints
  app.post('/api/client-products', async (req, res) => {
    try {
      const { products, productInputs } = await import('@shared/schema');
      
      const productData = {
        companyId: 1, // TODO: Get from session
        name: req.body.name,
        sku: req.body.sku || `CP-${Date.now()}`,
        type: req.body.type,
        volume: req.body.volume,
        description: req.body.description || null,
        productionModel: req.body.productionModel,
        annualProductionVolume: req.body.annualProductionVolume,
        productionUnit: req.body.productionUnit,
        status: 'active',
        isMainProduct: false
      };

      const [newProduct] = await db
        .insert(products)
        .values(productData)
        .returning();

      // Add product components
      if (req.body.components && req.body.components.length > 0) {
        const componentData = req.body.components.map((comp: any) => ({
          productId: newProduct.id,
          supplierProductId: comp.supplierProductId,
          inputCategory: comp.category,
          quantity: comp.quantity,
          unit: comp.unit,
          inputType: 'component'
        }));

        await db.insert(productInputs).values(componentData);
      }

      res.json({ ...newProduct, componentCount: req.body.components?.length || 0 });
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ error: 'Failed to create product' });
    }
  });

  // Register admin routes
  app.use('/api/admin', adminRouter);

  const server = createServer(app);
  
  return server;
}