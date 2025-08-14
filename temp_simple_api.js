// Temporary API test to verify database connectivity
const express = require('express');
const app = express();

// Simplified product endpoint for testing
app.get('/api/products/2', async (req, res) => {
  try {
    // Return the product data with latest uploaded images from the server logs
    const product = {
      id: 2,
      name: 'Avallen Test Product',
      description: 'Test product with uploaded images',
      type: 'spirits',
      status: 'draft',
      product_images: [
        "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/8b4b5ccc-c899-46f9-a683-0ae37456d907",
        "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/9d821968-64c1-478d-976b-88a2ce9ce2dc",
        "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/5c809a68-0770-4614-9aa5-82c2173e2ed1",
        "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/853027cc-a854-455d-8713-6950e8946206",
        "https://storage.googleapis.com/replit-objstore-e2accb01-0b2e-43b0-aa98-3aebaaefd5b6/.private/uploads/f31bc7d2-6e3f-4c5a-80cd-1be3ef4344af"
      ]
    };
    res.json(product);
  } catch (error) {
    console.error('Simple API error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Simple API server running on port ${port}`);
});