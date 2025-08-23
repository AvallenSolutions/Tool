import { Router } from 'express';
import { isAuthenticated } from '../../replitAuth';
import { storage as dbStorage } from '../../storage';
import { SupplierProductService } from '../../services/SupplierProductService';
import { db } from '../../db';
import { supplierProducts } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { logger, logDatabase } from '../../config/logger';

const router = Router();

// GET /api/supplier-products/:id - Get specific supplier product
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const product = await db.select()
      .from(supplierProducts)
      .where(eq(supplierProducts.id, productId))
      .limit(1);
    
    if (!product || product.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(product[0]);
    logDatabase('SELECT', 'supplier_products', undefined, { productId });
  } catch (error) {
    logger.error({ error, route: '/api/supplier-products/:id', productId: req.params.id }, 'Failed to fetch supplier product');
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// PUT /api/supplier-products/:id - Update supplier product
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const updateData = req.body;
    
    const [updatedProduct] = await db.update(supplierProducts)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(eq(supplierProducts.id, productId))
      .returning();
    
    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(updatedProduct);
    logDatabase('UPDATE', 'supplier_products', undefined, { productId, updateData: Object.keys(updateData) });
  } catch (error) {
    logger.error({ error, route: '/api/supplier-products/:id', productId: req.params.id }, 'Failed to update supplier product');
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/supplier-products/:id - Delete supplier product
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    
    const [deletedProduct] = await db.delete(supplierProducts)
      .where(eq(supplierProducts.id, productId))
      .returning({ id: supplierProducts.id });
    
    if (!deletedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json({ success: true, message: 'Product deleted successfully' });
    logDatabase('DELETE', 'supplier_products', undefined, { productId });
  } catch (error) {
    logger.error({ error, route: '/api/supplier-products/:id', productId: req.params.id }, 'Failed to delete supplier product');
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

// POST /api/supplier-products/enhanced - Create enhanced supplier product
router.post('/enhanced', async (req, res) => {
  try {
    const productData = req.body;
    
    const newProduct = await SupplierProductService.createEnhancedProduct(productData);
    
    res.status(201).json(newProduct);
    logDatabase('INSERT', 'supplier_products', undefined, { productName: productData.name });
  } catch (error) {
    logger.error({ error, route: '/api/supplier-products/enhanced' }, 'Failed to create enhanced supplier product');
    res.status(500).json({ error: 'Failed to create enhanced product' });
  }
});

export default router;