import { WebsiteScrapingService } from './dist/server/services/websiteScraping.js';

async function testTakamakaRum() {
  try {
    console.log('Testing Takamaka Rum scraping...');
    const result = await WebsiteScrapingService.scrapeCompanyInfo('https://www.takamakarum.com');
    
    console.log('\n=== SCRAPING RESULTS ===');
    console.log('Company Name:', result.name);
    console.log('Address:', result.address);
    console.log('Contact Details:', result.contactDetails);
    console.log('\nProducts found:', result.products.length);
    
    result.products.forEach((product, index) => {
      console.log(`${index + 1}. "${product.name}" (${product.category || 'no category'}) ${product.isPrimary ? '[PRIMARY]' : ''}`);
      if (product.imageUrl) {
        console.log(`   Image: ${product.imageUrl}`);
      }
    });
    
  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}

testTakamakaRum();