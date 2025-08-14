import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import Stripe from "stripe";
import passport from "passport";
import { storage as dbStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertCompanySchema, insertProductSchema, insertSupplierSchema, insertUploadedDocumentSchema, insertLcaQuestionnaireSchema, insertCompanySustainabilityDataSchema, companies, reports, users } from "@shared/schema";
import { db } from "./db";
import { eq, desc, ilike, or, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import multer from "multer";
import { extractUtilityData, analyzeDocument } from "./anthropic";
import { simpleLcaService } from "./simpleLca";
import { PDFService } from "./pdfService";
import { WebScrapingService } from "./services/WebScrapingService";
import { PDFExtractionService } from "./services/PDFExtractionService";
import { body, validationResult } from "express-validator";
import { adminRouter } from "./routes/admin";
import { SupplierProductService } from "./services/SupplierProductService";
import { BulkImportService } from "./services/BulkImportService";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-06-30.basil",
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
      cb(new Error('Only image files are allowed') as any, false);
    }
  }
});

export function registerRoutes(app: Express): Server {
  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
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

  // Input validation middleware
  const validateAnalysisInput = [
    body('type').isIn(['website', 'text']).withMessage('Type must be either "website" or "text"'),
    body('content').isLength({ min: 1, max: 50000 }).trim().escape().withMessage('Content must be between 1 and 50000 characters'),
  ];

  // GreenwashGuardian API Routes - AI-powered analysis
  app.post('/api/greenwash-guardian/analyze', validateAnalysisInput, async (req: any, res: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
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
      } catch (parseError: any) {
        console.error('JSON parse failed, trying alternative approach:', parseError.message);
        
        // Fallback: try to find valid JSON more aggressively
        const jsonMatches = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatches && jsonMatches[0]) {
          try {
            result = JSON.parse(jsonMatches[0]);
          } catch (secondError: any) {
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
    } catch (error: any) {
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
  app.post('/api/upload-lca-document', upload.single('lcaDocument'), async (req, res) => {
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
      const documentPath = req.file.filename;
      
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

      console.log('Raw request body for supplier update:', JSON.stringify(updateData, null, 2));

      // Clean the request body and ensure proper date handling
      const { images, createdAt, updatedAt, submittedBy, companyName, ...cleanData } = updateData;
      
      // Only include valid supplier fields that can be updated
      const supplierUpdateData: any = {
        updatedAt: new Date() // Use Date object, not string
      };

      // Only add fields that are present and valid
      if (cleanData.supplierName && typeof cleanData.supplierName === 'string') {
        supplierUpdateData.supplierName = cleanData.supplierName;
      }
      if (cleanData.supplierCategory && typeof cleanData.supplierCategory === 'string') {
        supplierUpdateData.supplierCategory = cleanData.supplierCategory;
      }
      if (cleanData.website !== undefined) {
        supplierUpdateData.website = cleanData.website || null;
      }
      if (cleanData.contactEmail !== undefined) {
        supplierUpdateData.contactEmail = cleanData.contactEmail || null;
      }
      if (cleanData.description !== undefined) {
        supplierUpdateData.description = cleanData.description || null;
      }
      if (cleanData.location !== undefined) {
        supplierUpdateData.location = cleanData.location || null;
      }
      if (cleanData.addressStreet !== undefined) {
        supplierUpdateData.addressStreet = cleanData.addressStreet || null;
      }
      if (cleanData.addressCity !== undefined) {
        supplierUpdateData.addressCity = cleanData.addressCity || null;
      }
      if (cleanData.addressPostalCode !== undefined) {
        supplierUpdateData.addressPostalCode = cleanData.addressPostalCode || null;
      }
      if (cleanData.addressCountry !== undefined) {
        supplierUpdateData.addressCountry = cleanData.addressCountry || null;
      }
      if (cleanData.logoUrl !== undefined) {
        supplierUpdateData.logoUrl = cleanData.logoUrl || null;
      }
      if (cleanData.verificationStatus && typeof cleanData.verificationStatus === 'string') {
        supplierUpdateData.verificationStatus = cleanData.verificationStatus;
        // Automatically set isVerified based on verificationStatus
        supplierUpdateData.isVerified = cleanData.verificationStatus === 'verified';
      }

      console.log('Cleaned supplier update data:', JSON.stringify(supplierUpdateData, null, 2));

      // Update supplier in database
      const { verifiedSuppliers } = await import('@shared/schema');
      const updatedSupplier = await db
        .update(verifiedSuppliers)
        .set(supplierUpdateData)
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
          submittedBy: supplierProducts.submittedBy,
          createdAt: supplierProducts.createdAt,
          updatedAt: supplierProducts.updatedAt
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
  app.delete('/api/verified-suppliers/:id', async (req, res) => {
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

  // Update supplier product
  app.put('/api/supplier-products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const { supplierProducts } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      
      console.log('Updating supplier product:', id, updateData);
      
      const result = await db
        .update(supplierProducts)
        .set({
          productName: updateData.productName,
          productDescription: updateData.productDescription,
          sku: updateData.sku,
          productAttributes: updateData.productAttributes,
          certifications: updateData.certifications,
          updatedAt: new Date()
        })
        .where(eq(supplierProducts.id, id))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(result[0]);
    } catch (error) {
      console.error('❌ Error updating supplier product:', error);
      res.status(500).json({ error: 'Failed to update supplier product' });
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

  // Removed duplicate route - using consolidated version below

  // ============ IMAGE UPLOAD ENDPOINTS ============

  // Image upload endpoint for admin dashboard
  app.post('/api/admin/upload-image', isAuthenticated, async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  // Object storage upload endpoint (for supplier images, etc.)
  app.post('/api/objects/upload', async (req, res) => {
    try {
      console.log('Getting upload URL for object storage...');
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      console.log('Upload URL generated successfully:', uploadURL);
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Failed to get upload URL', 
        message: errorMessage,
        details: error instanceof Error ? error.stack : String(error)
      });
    }
  });

  // Image upload completion endpoint - sets ACL and returns normalized path
  app.put('/api/admin/images', async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: 'imageURL is required' });
    }

    const userId = (req.user as any)?.claims?.sub || 'dev-user';

    try {
      console.log('Setting ACL for image:', req.body.imageURL);
      const objectStorageService = new ObjectStorageService();
      
      // Normalize the path from Google Cloud Storage URL to object path
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);

      console.log('Image processed, returning object path:', objectPath);
      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error('Error setting image ACL:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ 
        error: 'Internal server error',
        message: errorMessage
      });
    }
  });

  // Serve images as base64 data URLs to bypass all proxy issues  
  app.get("/image-data/:objectPath(*)", async (req, res) => {
    const objectPath = `/objects/${req.params.objectPath}`;
    console.log('Image base64 request for:', objectPath);
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        objectPath,
      );
      
      // Get file metadata and stream
      const [metadata] = await objectFile.getMetadata();
      const contentType = metadata.contentType || 'image/jpeg';
      
      // Read file as buffer
      const chunks: Uint8Array[] = [];
      const stream = objectFile.createReadStream();
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      console.log(`Serving image as base64, size: ${buffer.length} bytes, type: ${contentType}`);
      
      // Return JSON with data URL
      res.json({ dataUrl });
      
    } catch (error) {
      console.error("Error serving image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: 'Image not found' });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Keep original route for direct server access
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Serve public assets
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Serve debug test page
  app.get("/debug-test.html", (req, res) => {
    const filePath = path.join(process.cwd(), 'debug-test.html');
    res.sendFile(filePath);
  });

  // Serve add product images page
  app.get("/add-product-images.html", (req, res) => {
    const filePath = path.join(process.cwd(), 'add-product-images.html');
    res.sendFile(filePath);
  });

  // Serve simple image test page
  app.get("/simple-image-test.html", (req, res) => {
    const filePath = path.join(process.cwd(), 'simple-image-test.html');
    res.sendFile(filePath);
  });

  // Simple image serving route - no fancy processing
  app.get("/simple-image/objects/:objectPath(*)", async (req, res) => {
    const objectPath = `/objects/${req.params.objectPath}`;
    console.log('Simple image request for:', objectPath);
    
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      
      // Set basic headers and stream the file
      const [metadata] = await objectFile.getMetadata();
      res.set({
        'Content-Type': metadata.contentType || 'image/jpeg',
        'Content-Length': metadata.size,
        'Cache-Control': 'public, max-age=3600'
      });
      
      const stream = objectFile.createReadStream();
      stream.pipe(res);
      
      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).send('Error streaming image');
        }
      });
      
    } catch (error) {
      console.error("Error serving simple image:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).send('Image not found');
      }
      return res.status(500).send('Internal server error');
    }
  });

  // Serve test page
  app.get("/test-base64.html", (req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head><title>Base64 Test</title></head>
<body>
    <h1>Base64 Image Test</h1>
    <button onclick="testBase64()">Test New Image</button>
    <div id="result"></div>
    <script>
        async function testBase64() {
            try {
                console.log('Testing base64 API...');
                const response = await fetch('/image-data/uploads/b0425006-4efb-456c-897e-140a9f9c741d');
                const data = await response.json();
                
                if (data.dataUrl) {
                    document.getElementById('result').innerHTML = \`
                        <p>SUCCESS! Base64 data URL received (length: \${data.dataUrl.length})</p>
                        <img src="\${data.dataUrl}" style="max-width: 300px; border: 2px solid green;">
                    \`;
                    console.log('✅ Base64 image loaded successfully');
                } else {
                    document.getElementById('result').innerHTML = '<p>Failed: No dataUrl in response</p>';
                }
            } catch (error) {
                console.error('Base64 test failed:', error);
                document.getElementById('result').innerHTML = \`<p>Error: \${error.message}</p>\`;
            }
        }
    </script>
</body>
</html>`);
  });

  // Simple image proxy for debugging
  app.get("/api/image-proxy", async (req, res) => {
    try {
      const imageUrl = req.query.url as string;
      if (!imageUrl) {
        return res.status(400).json({ error: "URL parameter required" });
      }
      
      console.log("Image proxy request for:", imageUrl);
      
      const response = await fetch(imageUrl);
      if (!response.ok) {
        console.log("Failed to fetch image:", response.status, response.statusText);
        return res.status(response.status).json({ error: "Failed to fetch image" });
      }
      
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      
      const imageBuffer = await response.arrayBuffer();
      res.send(Buffer.from(imageBuffer));
      
    } catch (error: any) {
      console.error("Image proxy error:", error);
      res.status(500).json({ error: "Internal server error", message: error.message });
    }
  });

  // ============ END IMAGE UPLOAD ENDPOINTS ============

  // ============ PRODUCT SEARCH ENDPOINTS ============

  // Enhanced product search endpoint
  app.get('/api/products/search', async (req, res) => {
    try {
      const { name, type, supplier_id, category, limit = 50 } = req.query;
      const { verifiedSuppliers, supplierProducts } = await import('@shared/schema');
      const { eq, and, like, ilike } = await import('drizzle-orm');
      
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
          imageUrl: supplierProducts.imageUrl,
          isVerified: supplierProducts.isVerified,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          logoUrl: verifiedSuppliers.logoUrl,
          createdAt: supplierProducts.createdAt
        })
        .from(supplierProducts)
        .innerJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
        .where(and(
          eq(supplierProducts.isVerified, true),
          eq(verifiedSuppliers.isVerified, true)
        ))
        .limit(parseInt(limit as string) || 50);

      // Build search conditions
      const conditions = [
        eq(supplierProducts.isVerified, true),
        eq(verifiedSuppliers.isVerified, true)
      ];

      // Filter by product name (case-insensitive partial match)
      if (name && typeof name === 'string') {
        conditions.push(ilike(supplierProducts.productName, `%${name}%`));
      }

      // Filter by product type/category (supplier category)
      if (type && typeof type === 'string') {
        conditions.push(eq(verifiedSuppliers.supplierCategory, type));
      }

      // Filter by category (alias for type)
      if (category && typeof category === 'string') {
        conditions.push(eq(verifiedSuppliers.supplierCategory, category));
      }

      // Filter by specific supplier ID
      if (supplier_id && typeof supplier_id === 'string') {
        conditions.push(eq(supplierProducts.supplierId, supplier_id));
      }

      // Apply all conditions using AND logic
      const baseQuery = db
        .select({
          id: supplierProducts.id,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          supplierId: supplierProducts.supplierId,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          isVerified: supplierProducts.isVerified,
          productAttributes: supplierProducts.productAttributes,
          basePrice: supplierProducts.basePrice,
          currency: supplierProducts.currency,
          minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
          leadTimeDays: supplierProducts.leadTimeDays,
          certifications: supplierProducts.certifications,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          createdAt: supplierProducts.createdAt
        })
        .from(supplierProducts)
        .leftJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id));
        
      const finalQuery = conditions.length > 0 ? baseQuery.where(and(...conditions)) : baseQuery;

      const products = await finalQuery;
      
      res.json({
        products,
        total: products.length,
        filters: {
          name: name || null,
          type: type || null,
          category: category || null,
          supplier_id: supplier_id || null,
        }
      });
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ 
        error: 'Internal server error occurred while searching products',
        products: [],
        total: 0
      });
    }
  });

  // Get available product categories/types for search filters
  app.get('/api/products/categories', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      const categories = await db
        .select({
          category: verifiedSuppliers.supplierCategory,
          count: sql<number>`cast(count(*) as int)`
        })
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.isVerified, true))
        .groupBy(verifiedSuppliers.supplierCategory)
        .orderBy(verifiedSuppliers.supplierCategory);

      res.json(categories);
    } catch (error) {
      console.error('Error fetching product categories:', error);
      res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });

  // ============ END PRODUCT SEARCH ENDPOINTS ============

  // ============ COMPANY SUSTAINABILITY DATA ENDPOINTS ============

  // Get company sustainability data
  app.get('/api/company/sustainability-data', isAuthenticated, async (req, res) => {
    try {
      const userId = (req.user as any)?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const sustainabilityData = await dbStorage.getCompanySustainabilityData(company.id);
      res.json(sustainabilityData || {
        companyId: company.id,
        certifications: [],
        environmentalPolicies: {
          wasteManagement: '',
          energyEfficiency: '',
          waterConservation: '',
          carbonReduction: ''
        },
        facilitiesData: {
          energySource: '',
          renewableEnergyPercentage: undefined,
          wasteRecyclingPercentage: undefined,
          waterTreatment: '',
          transportationMethods: []
        },
        sustainabilityReporting: {
          hasAnnualReport: false,
          reportingStandards: [],
          thirdPartyVerification: false,
          scopeEmissions: {
            scope1: false,
            scope2: false,
            scope3: false
          }
        },
        goals: {
          carbonNeutralTarget: '',
          sustainabilityGoals: '',
          circularEconomyInitiatives: ''
        },
        completionPercentage: 0
      });
    } catch (error) {
      console.error('Error fetching sustainability data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update company sustainability data
  app.put('/api/company/sustainability-data', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const company = await dbStorage.getCompanyByOwner(userId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Validate the request body
      const validatedData = insertCompanySustainabilityDataSchema.parse(req.body);

      // Calculate completion percentage
      const completionPercentage = calculateSustainabilityCompletionPercentage(validatedData);

      const updatedData = await dbStorage.upsertCompanySustainabilityData(company.id, {
        ...validatedData,
        completionPercentage
      });

      res.json(updatedData);
    } catch (error) {
      console.error('Error updating sustainability data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Helper function to calculate completion percentage
  function calculateSustainabilityCompletionPercentage(data: any): number {
    let totalFields = 0;
    let completedFields = 0;

    // Count environmental policies
    if (data.environmentalPolicies) {
      totalFields += 4;
      Object.values(data.environmentalPolicies).forEach(value => {
        if (value && typeof value === 'string' && value.trim().length > 0) {
          completedFields++;
        }
      });
    }

    // Count facilities data
    if (data.facilitiesData) {
      totalFields += 5;
      if (data.facilitiesData.energySource && data.facilitiesData.energySource.trim().length > 0) completedFields++;
      if (data.facilitiesData.renewableEnergyPercentage !== undefined && data.facilitiesData.renewableEnergyPercentage !== null) completedFields++;
      if (data.facilitiesData.wasteRecyclingPercentage !== undefined && data.facilitiesData.wasteRecyclingPercentage !== null) completedFields++;
      if (data.facilitiesData.waterTreatment && data.facilitiesData.waterTreatment.trim().length > 0) completedFields++;
      if (data.facilitiesData.transportationMethods && data.facilitiesData.transportationMethods.length > 0) completedFields++;
    }

    // Count sustainability reporting
    if (data.sustainabilityReporting) {
      totalFields += 4;
      if (data.sustainabilityReporting.hasAnnualReport) completedFields++;
      if (data.sustainabilityReporting.reportingStandards && data.sustainabilityReporting.reportingStandards.length > 0) completedFields++;
      if (data.sustainabilityReporting.thirdPartyVerification) completedFields++;
      if (data.sustainabilityReporting.scopeEmissions && 
          (data.sustainabilityReporting.scopeEmissions.scope1 || 
           data.sustainabilityReporting.scopeEmissions.scope2 || 
           data.sustainabilityReporting.scopeEmissions.scope3)) completedFields++;
    }

    // Count goals
    if (data.goals) {
      totalFields += 3;
      Object.values(data.goals).forEach(value => {
        if (value && typeof value === 'string' && value.trim().length > 0) {
          completedFields++;
        }
      });
    }

    // Count certifications
    totalFields += 1;
    if (data.certifications && data.certifications.length > 0) {
      completedFields++;
    }

    return totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;
  }

  // ============ END COMPANY SUSTAINABILITY DATA ENDPOINTS ============

  // ============ SUPPLIER INVITATION ENDPOINTS ============

  // Validation for supplier invitations
  const validateSupplierInvitation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('category').isLength({ min: 1, max: 100 }).trim().escape().withMessage('Category is required and must be less than 100 characters'),
    body('companyName').isLength({ min: 1, max: 255 }).trim().escape().withMessage('Company name is required and must be less than 255 characters'),
    body('contactName').optional().isLength({ max: 255 }).trim().escape().withMessage('Contact name must be less than 255 characters'),
    body('message').optional().isLength({ max: 1000 }).trim().escape().withMessage('Message must be less than 1000 characters'),
  ];

  // Create a new supplier invitation
  app.post('/api/admin/supplier-invitations', isAuthenticated, validateSupplierInvitation, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const { supplierInvitations } = await import('@shared/schema');
      const { nanoid } = await import('nanoid');
      
      const { email, category, companyName, contactName, message } = req.body;
      
      if (!email || !category || !companyName) {
        return res.status(400).json({ 
          error: 'Email, category, and company name are required' 
        });
      }

      // Check if invitation already exists for this email
      const existingInvitation = await db
        .select()
        .from(supplierInvitations)
        .where(eq(supplierInvitations.supplierEmail, email))
        .limit(1);

      if (existingInvitation.length > 0) {
        return res.status(400).json({ 
          error: 'An invitation already exists for this email address' 
        });
      }

      // Generate unique invitation token
      const invitationToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Get current user ID for invitedBy
      const user = req.user as any;
      const invitedByUserId = user.claims?.sub;
      
      if (!invitedByUserId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const newInvitation = await db
        .insert(supplierInvitations)
        .values({
          token: invitationToken,
          supplierEmail: email,
          supplierName: companyName,
          invitedBy: invitedByUserId,
          expectedSupplierCategory: category,
          invitationMessage: message || null,
          expiresAt,
          status: 'pending',
        })
        .returning();

      res.json({ 
        success: true, 
        invitation: newInvitation[0],
        invitationUrl: `${req.get('origin')}/supplier-onboarding?token=${invitationToken}`
      });
    } catch (error) {
      console.error('Error creating supplier invitation:', error);
      res.status(500).json({ error: 'Failed to create supplier invitation' });
    }
  });

  // Get all supplier invitations (admin only)
  app.get('/api/admin/supplier-invitations', isAuthenticated, async (req, res) => {
    try {
      const { supplierInvitations } = await import('@shared/schema');
      
      const invitations = await db
        .select()
        .from(supplierInvitations)
        .orderBy(desc(supplierInvitations.createdAt));

      res.json(invitations);
    } catch (error) {
      console.error('Error fetching supplier invitations:', error);
      res.status(500).json({ error: 'Failed to fetch supplier invitations' });
    }
  });

  // Validate invitation token (public endpoint)
  app.get('/api/supplier-invitations/validate/:token', async (req, res) => {
    try {
      const { supplierInvitations } = await import('@shared/schema');
      const { token } = req.params;
      
      const invitation = await db
        .select()
        .from(supplierInvitations)
        .where(eq(supplierInvitations.token, token))
        .limit(1);

      if (!invitation.length) {
        return res.status(404).json({ error: 'Invalid invitation token' });
      }

      const inv = invitation[0];
      
      // Check if invitation has expired
      if (new Date() > inv.expiresAt) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Check if already used
      if (inv.status === 'completed') {
        return res.status(400).json({ error: 'Invitation has already been used' });
      }

      res.json({ 
        valid: true, 
        invitation: {
          id: inv.id,
          email: inv.supplierEmail,
          category: inv.expectedSupplierCategory,
          companyName: inv.supplierName,
          contactName: inv.supplierName,
          message: inv.invitationMessage,
        }
      });
    } catch (error) {
      console.error('Error validating invitation:', error);
      res.status(500).json({ error: 'Failed to validate invitation' });
    }
  });

  // Accept supplier invitation and create supplier (public endpoint)
  app.post('/api/supplier-invitations/accept/:token', async (req, res) => {
    try {
      const { supplierInvitations, verifiedSuppliers } = await import('@shared/schema');
      const { token } = req.params;
      const {
        supplierName,
        description,
        website,
        contactName,
        contactEmail,
        contactPhone,
        addressStreet,
        addressCity,
        addressCountry,
        certifications
      } = req.body;

      // Validate invitation token
      const invitation = await db
        .select()
        .from(supplierInvitations)
        .where(eq(supplierInvitations.token, token))
        .limit(1);

      if (!invitation.length) {
        return res.status(404).json({ error: 'Invalid invitation token' });
      }

      const inv = invitation[0];
      
      if (new Date() > inv.expiresAt) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      if (inv.status === 'completed') {
        return res.status(400).json({ error: 'Invitation has already been used' });
      }

      // Create new supplier
      const newSupplier = await db
        .insert(verifiedSuppliers)
        .values({
          supplierName: supplierName,
          supplierCategory: inv.expectedSupplierCategory,
          description,
          website,
          contactName,
          contactEmail: contactEmail || inv.supplierEmail,
          contactPhone,
          addressStreet,
          addressCity,
          addressCountry,
          certifications: certifications || [],
          isVerified: false, // Requires admin approval
          verificationStatus: 'pending',
        })
        .returning();

      // Mark invitation as used
      await db
        .update(supplierInvitations)
        .set({ 
          status: 'completed', 
          usedAt: new Date()
        })
        .where(eq(supplierInvitations.id, inv.id));

      res.json({ 
        success: true, 
        supplier: newSupplier[0],
        message: 'Supplier registration completed. Your application is under review.'
      });
    } catch (error) {
      console.error('Error accepting supplier invitation:', error);
      res.status(500).json({ error: 'Failed to complete supplier registration' });
    }
  });

  // ============ END SUPPLIER INVITATION ENDPOINTS ============

  // Verified Suppliers API endpoints
  app.get('/api/verified-suppliers', async (req, res) => {
    try {
      const { verifiedSuppliers } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const category = req.query.category as string;
      
      let query = db
        .select()
        .from(verifiedSuppliers)
        .where(eq(verifiedSuppliers.verificationStatus, 'verified'));
        
      if (category) {
        query = db
          .select()
          .from(verifiedSuppliers) 
          .where(and(
            eq(verifiedSuppliers.verificationStatus, 'verified'),
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
        addressStreet: req.body.addressLine1 || req.body.addressStreet,
        addressCity: req.body.city || req.body.addressCity,
        addressPostalCode: req.body.postalCode || req.body.addressPostalCode,
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

  // Consolidated Supplier Product endpoint - supports both admin dashboard and supplier network
  app.get('/api/supplier-products', async (req, res) => {
    try {
      const { supplierProducts, verifiedSuppliers } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const category = req.query.category as string;
      const supplierId = req.query.supplier as string;
      
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

      const query = db
        .select({
          id: supplierProducts.id,
          productName: supplierProducts.productName,
          productDescription: supplierProducts.productDescription,
          sku: supplierProducts.sku,
          supplierId: supplierProducts.supplierId,
          supplierName: verifiedSuppliers.supplierName,
          supplierCategory: verifiedSuppliers.supplierCategory,
          isVerified: supplierProducts.isVerified,
          productAttributes: supplierProducts.productAttributes,
          basePrice: supplierProducts.basePrice,
          currency: supplierProducts.currency,
          minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
          leadTimeDays: supplierProducts.leadTimeDays,
          certifications: supplierProducts.certifications,
          hasPrecalculatedLca: supplierProducts.hasPrecalculatedLca,
          lcaDataJson: supplierProducts.lcaDataJson,
          createdAt: supplierProducts.createdAt
        })
        .from(supplierProducts)
        .leftJoin(verifiedSuppliers, eq(supplierProducts.supplierId, verifiedSuppliers.id))
        .where(and(...conditions));

      const products = await query;
      
      console.log(`Products fetched: ${products.length} for company ${(req.user as any)?.companyId || 'unknown'}`);
      
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
      const companyId = (req.session as any)?.user?.companyId || 1; // Fallback for development
      
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
        // Basic fields
        name: req.body.name,
        sku: req.body.sku,
        type: req.body.type,
        volume: req.body.volume,
        description: req.body.description,
        status: req.body.status || 'active',
        
        // Production fields from nested objects
        productionModel: req.body.production?.productionModel,
        annualProductionVolume: req.body.production?.annualProductionVolume,
        productionUnit: req.body.production?.productionUnit || 'bottles',
        
        // Extract packaging data from nested structure
        bottleMaterial: req.body.packaging?.primaryContainer?.material || req.body.bottleMaterial,
        bottleWeight: req.body.packaging?.primaryContainer?.weight || req.body.bottleWeight,
        bottleRecycledContent: req.body.packaging?.primaryContainer?.recycledContent || req.body.bottleRecycledContent,
        bottleColor: req.body.packaging?.primaryContainer?.color || req.body.bottleColor,
        
        // Closure data
        closureType: req.body.packaging?.closure?.closureType || req.body.closureType,
        closureMaterial: req.body.packaging?.closure?.material || req.body.closureMaterial,
        closureWeight: req.body.packaging?.closure?.weight || req.body.closureWeight,
        
        // Label data
        labelMaterial: req.body.packaging?.labeling?.labelMaterial || req.body.labelMaterial,
        labelWeight: req.body.packaging?.labeling?.labelWeight || req.body.labelWeight,
        labelPrintingMethod: req.body.packaging?.labeling?.printingMethod || req.body.labelPrintingMethod,
        labelInkType: req.body.packaging?.labeling?.inkType || req.body.labelInkType,
        labelSize: req.body.packaging?.labeling?.labelSize || req.body.labelSize,
        
        // Secondary packaging
        hasSecondaryPackaging: convertBoolean(req.body.packaging?.secondaryPackaging?.hasSecondaryPackaging || req.body.hasSecondaryPackaging),
        boxMaterial: req.body.packaging?.secondaryPackaging?.boxMaterial || req.body.boxMaterial,
        boxWeight: req.body.packaging?.secondaryPackaging?.boxWeight || req.body.boxWeight,
        
        // Packaging supplier information
        packagingSupplier: req.body.packaging?.supplierInformation?.supplierName || req.body.packagingSupplier,
        packagingSupplierId: req.body.packaging?.supplierInformation?.selectedSupplierId || req.body.packagingSupplierId,
        packagingSupplierCategory: req.body.packaging?.supplierInformation?.supplierCategory || req.body.packagingSupplierCategory,
        packagingSelectedProductId: req.body.packaging?.supplierInformation?.selectedProductId || req.body.packagingSelectedProductId,
        packagingSelectedProductName: req.body.packaging?.supplierInformation?.selectedProductName || req.body.packagingSelectedProductName,
        
        // Production process data
        electricityKwh: req.body.production?.energyConsumption?.electricityKwh || req.body.electricityKwh,
        renewableEnergyPercent: req.body.production?.energyConsumption?.renewableEnergyPercent || req.body.renewableEnergyPercent,
        processWaterLiters: req.body.production?.waterUsage?.processWaterLiters || req.body.processWaterLiters,
        cleaningWaterLiters: req.body.production?.waterUsage?.cleaningWaterLiters || req.body.cleaningWaterLiters,
        
        // Distribution data
        averageTransportDistance: req.body.distribution?.averageTransportDistance || req.body.averageTransportDistance,
        primaryTransportMode: req.body.distribution?.primaryTransportMode || req.body.primaryTransportMode,
        distributionCenters: req.body.distribution?.distributionCenters || req.body.distributionCenters,
        coldChainRequired: convertBoolean(req.body.distribution?.coldChainRequired || req.body.coldChainRequired),
        packagingEfficiency: req.body.distribution?.packagingEfficiency || req.body.packagingEfficiency,
        
        // End of life data
        returnableContainer: convertBoolean(req.body.endOfLife?.returnableContainer || req.body.returnableContainer),
        recyclingRate: req.body.endOfLife?.recyclingRate || req.body.recyclingRate,
        disposalMethod: req.body.endOfLife?.disposalMethod || req.body.disposalMethod,
        consumerEducation: req.body.endOfLife?.consumerEducation || req.body.consumerEducation,
        
        // Other fields with proper conversion
        ingredients: req.body.ingredients,
        certifications: req.body.certifications,
        isMainProduct: convertBoolean(req.body.isMainProduct),
        hasBuiltInClosure: convertBoolean(req.body.hasBuiltInClosure),
        wasteWaterTreatment: convertBoolean(req.body.wasteWaterTreatment),
        
        // LCA document and images
        lcaDocumentPath: req.body.lcaDocumentPath,
        packShotUrl: req.body.productImages && req.body.productImages.length > 0 ? req.body.productImages[0] : null,
        
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

  // Delete image from product
  app.delete('/api/products/:id/images/:imageIndex', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const productId = parseInt(req.params.id);
      const imageIndex = parseInt(req.params.imageIndex);
      
      if (isNaN(productId) || isNaN(imageIndex)) {
        return res.status(400).json({ error: 'Invalid product ID or image index' });
      }

      // Get current product
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Remove image at specified index
      let currentImages = [];
      try {
        currentImages = product.productImages ? JSON.parse(product.productImages) : [];
      } catch {
        currentImages = Array.isArray(product.productImages) ? product.productImages : [];
      }

      if (imageIndex < 0 || imageIndex >= currentImages.length) {
        return res.status(400).json({ error: 'Invalid image index' });
      }

      // Remove the image at the specified index
      currentImages.splice(imageIndex, 1);

      // Update product with remaining images
      await db
        .update(products)
        .set({ 
          productImages: JSON.stringify(currentImages),
          updatedAt: new Date()
        })
        .where(eq(products.id, productId));

      res.json({ success: true, remainingImages: currentImages.length });
    } catch (error) {
      console.error('Error deleting image:', error);
      res.status(500).json({ error: 'Failed to delete image' });
    }
  });

  // Add image to product
  app.post('/api/products/:id/images', async (req, res) => {
    try {
      const { products } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const productId = parseInt(req.params.id);
      const { imageUrl } = req.body;
      
      if (isNaN(productId)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      if (!imageUrl) {
        return res.status(400).json({ error: 'Image URL is required' });
      }

      // Get current product
      const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
      
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Get current images and add new one
      let currentImages = [];
      try {
        currentImages = product.productImages ? JSON.parse(product.productImages) : [];
      } catch {
        currentImages = Array.isArray(product.productImages) ? product.productImages : [];
      }

      // Add new image
      currentImages.push(imageUrl);

      // Update product with new images
      await db
        .update(products)
        .set({ 
          productImages: JSON.stringify(currentImages),
          updatedAt: new Date()
        })
        .where(eq(products.id, productId));

      res.json({ success: true, totalImages: currentImages.length, imageUrl });
    } catch (error) {
      console.error('Error adding image:', error);
      res.status(500).json({ error: 'Failed to add image' });
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
      const { products, companies } = await import('@shared/schema');
      
      // Get or create a default company
      let companyId = 1;
      const existingCompanies = await db.select().from(companies).limit(1);
      
      if (existingCompanies.length === 0) {
        console.log('No companies found, creating default company');
        const [newCompany] = await db.insert(companies).values({
          name: 'Demo Company',
          industry: 'Spirits & Distilleries',
          size: 'SME (10-250 employees)',
          address: '123 Demo Street',
          country: 'United Kingdom',
          website: 'https://demo.company',
          ownerId: 44886248, // Use existing user ID
          onboardingComplete: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }).returning();
        companyId = newCompany.id;
        console.log('Created default company:', newCompany);
      } else {
        companyId = existingCompanies[0].id;
        console.log('Using existing company:', companyId);
      }
      
      // Process the complex form data structure properly
      console.log('Raw request body:', JSON.stringify(req.body, null, 2));
      
      // Extract nested objects and convert them to proper database format
      const {
        ingredients,
        packaging,
        production,
        environmental,
        certifications,
        distribution,
        endOfLife,
        ...basicFields
      } = req.body;

      // Debug packaging supplier information specifically
      console.log('🔍 Packaging object:', JSON.stringify(packaging, null, 2));
      console.log('🎯 Supplier Info:', packaging?.supplierInformation);

      const draftData = {
        companyId,
        ...basicFields,
        
        // Handle ingredients array (convert from form structure to DB structure)
        ingredients: ingredients ? JSON.stringify(ingredients) : null,
        
        // Handle nested packaging data - flatten to individual fields
        ...(packaging?.primaryContainer && {
          bottleMaterial: packaging.primaryContainer.material,
          bottleWeight: packaging.primaryContainer.weight ? parseFloat(packaging.primaryContainer.weight) : null,
          bottleRecycledContent: packaging.primaryContainer.recycledContent ? parseFloat(packaging.primaryContainer.recycledContent) : null,
          bottleColor: packaging.primaryContainer.color,
          bottleThickness: packaging.primaryContainer.thickness ? parseFloat(packaging.primaryContainer.thickness) : null,
        }),
        
        ...(packaging?.labeling && {
          labelMaterial: packaging.labeling.labelMaterial,
          labelWeight: packaging.labeling.labelWeight ? parseFloat(packaging.labeling.labelWeight) : null,
          labelSize: packaging.labeling.labelSize ? parseFloat(packaging.labeling.labelSize) : null,
        }),
        
        ...(packaging?.closure && {
          closureType: packaging.closure.closureType,
          closureMaterial: packaging.closure.material,
          closureWeight: packaging.closure.weight ? parseFloat(packaging.closure.weight) : null,
        }),
        
        // Handle supplier selection from packaging
        ...(packaging?.supplierInformation && {
          packagingSupplier: packaging.supplierInformation.supplierName || '',
          packagingSupplierId: packaging.supplierInformation.selectedSupplierId || '',
          packagingSupplierCategory: packaging.supplierInformation.supplierCategory || '',
          packagingSelectedProductId: packaging.supplierInformation.selectedProductId || '',
          packagingSelectedProductName: packaging.supplierInformation.selectedProductName || '',
        }),
        
        // Handle production data
        ...(production && {
          productionModel: production.productionModel,
          annualProductionVolume: production.annualProductionVolume ? parseFloat(production.annualProductionVolume) : null,
          productionUnit: production.productionUnit || 'bottles',
          facilityLocation: production.facilityLocation,
          energySource: production.energySource,
          waterSourceType: production.waterSourceType,
          heatRecoverySystem: production.heatRecoverySystem || false,
          wasteManagement: production.wasteManagement,
          // Store complex production data as JSONB if the field exists
          productionMethods: production.processSteps ? JSON.stringify(production) : null,
        }),
        
        // Handle environmental data
        ...(environmental && {
          carbonFootprint: environmental.carbonFootprint ? parseFloat(environmental.carbonFootprint) : null,
          waterFootprint: environmental.waterFootprint ? parseFloat(environmental.waterFootprint) : null,
        }),
        
        // Handle certifications array
        certifications: certifications ? JSON.stringify(certifications) : null,
        
        // Handle distribution data
        ...(distribution && {
          averageTransportDistance: distribution.averageTransportDistance ? parseFloat(distribution.averageTransportDistance) : null,
          primaryTransportMode: distribution.primaryTransportMode,
          coldChainRequired: distribution.coldChainRequired || false,
        }),
        
        // Handle end of life data
        ...(endOfLife && {
          returnableContainer: endOfLife.returnableContainer || false,
          recyclingRate: endOfLife.recyclingRate ? parseFloat(endOfLife.recyclingRate) : null,
          disposalMethod: endOfLife.disposalMethod,
        }),
        
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Processed draft data:', JSON.stringify(draftData, null, 2));
      
      // Debug packaging supplier information specifically
      console.log('📦 Packaging Supplier Debug:', {
        hasPackaging: !!packaging,
        hasSupplierInfo: !!packaging?.supplierInformation,
        supplierName: packaging?.supplierInformation?.supplierName,
        selectedSupplierId: packaging?.supplierInformation?.selectedSupplierId,
        supplierCategory: packaging?.supplierInformation?.supplierCategory,
        mappedValues: {
          packagingSupplier: draftData.packagingSupplier,
          packagingSupplierId: draftData.packagingSupplierId,
          packagingSupplierCategory: draftData.packagingSupplierCategory,
          packagingSelectedProductId: draftData.packagingSelectedProductId,
          packagingSelectedProductName: draftData.packagingSelectedProductName
        }
      });
      
      // Check if this is an update to an existing draft
      let productId = req.body.id;
      let product;
      
      if (productId) {
        // Update existing draft
        console.log('Updating existing draft:', productId);
        const updateData = { ...draftData };
        delete updateData.createdAt; // Don't update created timestamp
        
        const [updatedProduct] = await db
          .update(products)
          .set(updateData)
          .where(eq(products.id, productId))
          .returning();
        product = updatedProduct;
      } else {
        // Create new draft
        console.log('Creating new draft');
        const [newProduct] = await db.insert(products).values(draftData).returning();
        product = newProduct;
      }
      res.json(product);
    } catch (error) {
      console.error('Error saving draft:', error);
      res.status(500).json({ error: 'Failed to save draft', details: error.message });
    }
  });



  // Client Products API endpoints
  app.post('/api/client-products', async (req, res) => {
    try {
      const { products, productInputs, companies } = await import('@shared/schema');
      
      // Get the first available company (should exist from previous setup)
      const existingCompanies = await db.select().from(companies).limit(1);
      const companyId = existingCompanies.length > 0 ? existingCompanies[0].id : 1;
      
      const productData = {
        companyId,
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

  // ================== OBJECT STORAGE ENDPOINTS ==================
  
  // Get upload URL for object storage
  app.post('/api/objects/upload', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ error: 'Failed to get upload URL' });
    }
  });

  // DUPLICATE ROUTE REMOVED - using consolidated route above

  // Serve public objects (for static assets)
  app.get('/public-objects/:filePath(*)', async (req, res) => {
    try {
      const filePath = req.params.filePath;
      const objectStorageService = new ObjectStorageService();
      const file = await objectStorageService.searchPublicObject(filePath);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      await objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error('Error serving public object:', error);
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  });

  // Register admin routes
  app.use('/api/admin', adminRouter);

  // ================== LCA ENDPOINTS ==================

  // Create LCA for a specific product
  app.post('/api/products/:id/lca', async (req, res) => {
    try {
      const productId = parseInt(req.params.id);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      const result = await simpleLcaService.calculateProductLCA(productId, req.body.options);
      
      res.json({
        success: true,
        jobId: result.jobId,
        estimatedDuration: result.estimatedDuration,
        message: 'LCA calculation started successfully'
      });
    } catch (error) {
      console.error('Error creating LCA:', error);
      res.status(500).json({ 
        error: 'LCA Calculation Failed',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get LCA service status
  app.get('/api/lca/status', async (req, res) => {
    try {
      const status = await simpleLcaService.getServiceStatus();
      res.json(status);
    } catch (error) {
      console.error('Error getting LCA service status:', error);
      res.status(500).json({ 
        error: 'Failed to get LCA service status',
        details: error.message
      });
    }
  });

  // Start LCA calculation for a product
  app.post('/api/lca/calculate/:productId', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      const result = await simpleLcaService.calculateProductLCA(productId, req.body.options);
      res.json(result);
    } catch (error) {
      console.error('Error starting LCA calculation:', error);
      res.status(500).json({ 
        error: 'Failed to start LCA calculation',
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get LCA calculation status
  app.get('/api/lca/calculation/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const status = await simpleLcaService.getCalculationStatus(jobId);
      res.json(status);
    } catch (error) {
      console.error('Error getting LCA calculation status:', error);
      res.status(500).json({ 
        error: 'Failed to get calculation status',
        details: error.message
      });
    }
  });

  // Cancel LCA calculation
  app.delete('/api/lca/calculation/:jobId', async (req, res) => {
    try {
      const { jobId } = req.params;
      const success = await simpleLcaService.cancelCalculation(jobId);
      res.json({ success });
    } catch (error) {
      console.error('Error cancelling LCA calculation:', error);
      res.status(500).json({ 
        error: 'Failed to cancel calculation',
        details: error.message
      });
    }
  });

  // Get LCA history for a product
  app.get('/api/lca/product/:productId/history', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      const history = await simpleLcaService.getProductLCAHistory(productId);
      res.json(history);
    } catch (error) {
      console.error('Error getting LCA history:', error);
      res.status(500).json({ 
        error: 'Failed to get LCA history',
        details: error.message
      });
    }
  });

  // Validate product for LCA
  app.get('/api/lca/product/:productId/validate', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      const validation = await simpleLcaService.validateProductForLCA(productId);
      res.json(validation);
    } catch (error) {
      console.error('Error validating product for LCA:', error);
      res.status(500).json({ 
        error: 'Failed to validate product',
        details: error.message
      });
    }
  });

  // Get available impact methods
  app.get('/api/lca/impact-methods', async (req, res) => {
    try {
      const methods = await simpleLcaService.getAvailableImpactMethods();
      res.json(methods);
    } catch (error) {
      console.error('Error getting impact methods:', error);
      res.status(500).json({ 
        error: 'Failed to get impact methods',
        details: error.message
      });
    }
  });

  // Test Enhanced LCA Calculation System
  app.get('/api/test/enhanced-lca/:productId', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      // Test the enhanced LCA calculation system end-to-end
      const { ReportDataProcessor } = await import('./services/ReportDataProcessor');
      
      console.log(`🧪 Testing Enhanced LCA Calculation for Product ${productId}`);
      
      // Get comprehensive report data with enhanced calculation
      const reportData = await ReportDataProcessor.getEnhancedReportData(productId);
      
      // Return calculation results for verification
      res.json({
        productId: productId,
        productName: reportData.product.name,
        hasEnhancedLCA: !!reportData.enhancedLCAResults,
        enhancedResults: reportData.enhancedLCAResults ? {
          totalCarbonFootprint: reportData.enhancedLCAResults.totalCarbonFootprint,
          totalWaterFootprint: reportData.enhancedLCAResults.totalWaterFootprint,
          totalLandUse: reportData.enhancedLCAResults.totalLandUse,
          primaryEnergyDemand: reportData.enhancedLCAResults.primaryEnergyDemand,
          breakdown: reportData.enhancedLCAResults.breakdown,
          dataQuality: reportData.enhancedLCAResults.metadata.dataQuality,
          calculationMethod: reportData.enhancedLCAResults.metadata.calculationMethod,
          uncertaintyPercentage: reportData.enhancedLCAResults.metadata.uncertaintyPercentage,
        } : null,
        fallbackCarbon: reportData.report.totalCarbonFootprint,
        message: reportData.enhancedLCAResults ? 
          "✅ Enhanced LCA calculation completed successfully" : 
          "⚠️ Using fallback calculation - no granular LCA data available"
      });
    } catch (error) {
      console.error('Error testing enhanced LCA calculation:', error);
      res.status(500).json({ 
        error: 'Enhanced LCA test failed',
        details: error.message
      });
    }
  });

  // Download LCA PDF report
  app.get('/api/lca/product/:productId/download-pdf', async (req, res) => {
    try {
      const productId = parseInt(req.params.productId);
      
      if (isNaN(productId)) {
        return res.status(400).json({ 
          error: 'Invalid product ID',
          details: 'Product ID must be a valid number'
        });
      }

      // Use EnhancedPDFService for comprehensive reports instead of basic SimpleLcaService
      const { EnhancedPDFService } = await import('./services/EnhancedPDFService');
      const { ReportDataProcessor } = await import('./services/ReportDataProcessor');
      
      const enhancedPDFService = new EnhancedPDFService();
      
      // Get comprehensive report data for the product (static method call)
      const reportData = await ReportDataProcessor.getEnhancedReportData(productId);
      
      // Generate professional PDF using enhanced service
      const reportBuffer = await enhancedPDFService.generateEnhancedLCAPDF(reportData);
      
      // Serving as proper PDF
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="LCA_Report_Product_${productId}.pdf"`
      });
      
      res.send(reportBuffer);
    } catch (error) {
      console.error('Error generating PDF report:', error);
      res.status(500).json({ 
        error: 'Failed to generate PDF report',
        details: error.message
      });
    }
  });

  // Object storage routes for image uploads
  app.post('/api/objects/upload', async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      
      res.json({ 
        success: true,
        uploadURL 
      });
    } catch (error) {
      console.error('Error getting upload URL:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get upload URL',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // DUPLICATE ROUTE REMOVED - using /objects/ route directly instead of /api/objects/

  const server = createServer(app);
  
  return server;
}