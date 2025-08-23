import { Router } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { validateSupplierData, handleValidationErrors } from '../../middleware/validation';
import { SupplierProductService } from '../../services/SupplierProductService';
import { BulkImportService } from '../../services/BulkImportService';
import { WebScrapingService } from '../../services/WebScrapingService';
import { db } from '../../db';
import { suppliers, supplierProducts, users } from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { logger, logAPI, logDatabase } from '../../config/logger';

const router = Router();

// Configure multer for image uploads
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

// GET /api/suppliers - Get all suppliers
router.get('/', async (req, res) => {
  try {
    const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.createdAt));
    res.json(allSuppliers);
    logDatabase('SELECT', 'suppliers', undefined, { count: allSuppliers.length });
  } catch (error) {
    logger.error({ error, route: '/api/suppliers' }, 'Failed to fetch suppliers');
    res.status(500).json({ error: 'Failed to fetch suppliers' });
  }
});

// GET /api/suppliers/:id - Get specific supplier
router.get('/:id', async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    const supplier = await dbStorage.getSupplier(supplierId);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(supplier);
    logDatabase('SELECT', 'suppliers', undefined, { supplierId });
  } catch (error) {
    logger.error({ error, route: '/api/suppliers/:id', supplierId: req.params.id }, 'Failed to fetch supplier');
    res.status(500).json({ error: 'Failed to fetch supplier' });
  }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', validateSupplierData, async (req, res) => {
  try {
    const supplierId = parseInt(req.params.id);
    const updateData = req.body;
    
    const updatedSupplier = await dbStorage.updateSupplier(supplierId, updateData);
    
    if (!updatedSupplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    res.json(updatedSupplier);
    logDatabase('UPDATE', 'suppliers', undefined, { supplierId, updateData: Object.keys(updateData) });
  } catch (error) {
    logger.error({ error, route: '/api/suppliers/:id', supplierId: req.params.id }, 'Failed to update supplier');
    res.status(500).json({ error: 'Failed to update supplier' });
  }
});

// POST /api/suppliers/scrape-product - Scrape product data from URL
router.post('/scrape-product', async (req, res) => {
  try {
    const { url, supplierId } = req.body;
    
    if (!url || !supplierId) {
      return res.status(400).json({ error: 'URL and supplier ID are required' });
    }
    
    const productData = await WebScrapingService.scrapeProductData(url);
    res.json({ success: true, data: productData });
    
    logger.info({ supplierId, url: url.substring(0, 50) }, 'Product data scraped successfully');
  } catch (error) {
    logger.error({ error, route: '/api/suppliers/scrape-product' }, 'Failed to scrape product data');
    res.status(500).json({ error: 'Failed to scrape product data' });
  }
});

// POST /api/suppliers/upload-images - Upload supplier images
router.post('/upload-images', imageUpload.array('images', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }
    
    const imageUrls = files.map(file => `/uploads/images/${file.filename}`);
    
    res.json({
      success: true,
      images: imageUrls,
      message: `Successfully uploaded ${files.length} image(s)`
    });
    
    logger.info({ imageCount: files.length }, 'Images uploaded successfully');
  } catch (error) {
    logger.error({ error, route: '/api/suppliers/upload-images' }, 'Failed to upload images');
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/suppliers/bulk-import - Bulk import suppliers
router.post('/bulk-import', async (req, res) => {
  try {
    const { suppliers: supplierData, userId } = req.body;
    
    if (!supplierData || !Array.isArray(supplierData)) {
      return res.status(400).json({ error: 'Supplier data must be an array' });
    }
    
    const result = await BulkImportService.importSuppliers(supplierData, userId);
    
    res.json({
      success: true,
      imported: result.successful.length,
      failed: result.failed.length,
      details: result
    });
    
    logger.info({ 
      imported: result.successful.length, 
      failed: result.failed.length,
      userId 
    }, 'Bulk supplier import completed');
  } catch (error) {
    logger.error({ error, route: '/api/suppliers/bulk-import' }, 'Failed to bulk import suppliers');
    res.status(500).json({ error: 'Failed to import suppliers' });
  }
});

export default router;