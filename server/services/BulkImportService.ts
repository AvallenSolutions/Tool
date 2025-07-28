import { WebScrapingService } from './WebScrapingService';
import { PDFExtractionService } from './PDFExtractionService';
import { SupplierProductService } from './SupplierProductService';
import * as cheerio from 'cheerio';

interface BulkImportResult {
  suppliersCreated: number;
  productsCreated: number;
  pdfsProcessed: number;
  linksScraped: number;
  errors: string[];
  results: Array<{
    type: 'supplier' | 'product';
    name: string;
    source: string;
    success: boolean;
    error?: string;
  }>;
}

interface ProductLink {
  url: string;
  title: string;
  pdfUrl?: string;
}

export class BulkImportService {
  private webScrapingService: WebScrapingService;
  private pdfExtractionService: PDFExtractionService;
  private supplierProductService: SupplierProductService;

  constructor() {
    this.webScrapingService = new WebScrapingService();
    this.pdfExtractionService = new PDFExtractionService();
    this.supplierProductService = new SupplierProductService();
  }

  async processCatalogPage(catalogUrl: string): Promise<BulkImportResult> {
    const result: BulkImportResult = {
      suppliersCreated: 0,
      productsCreated: 0,
      pdfsProcessed: 0,
      linksScraped: 0,
      errors: [],
      results: []
    };

    try {
      
      
      // Step 1: Discover product links from catalog page
      const productLinks = await this.discoverProductLinks(catalogUrl);
      result.linksScraped = productLinks.length;
      
      

      // Step 2: Process each product link
      for (const link of productLinks) {
        try {
          await this.processProductLink(link, result);
        } catch (error) {
          const errorMessage = `Failed to process ${link.url}: ${error.message}`;
          result.errors.push(errorMessage);
          console.error(errorMessage);
        }
      }

      
      return result;

    } catch (error) {
      result.errors.push(`Catalog processing failed: ${error.message}`);
      throw error;
    }
  }

  private async discoverProductLinks(catalogUrl: string): Promise<ProductLink[]> {
    try {
      const response = await fetch(catalogUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);
      const links: ProductLink[] = [];

      // Verallia-specific selectors (can be extended for other sites)
      if (catalogUrl.includes('verallia.com')) {
        links.push(...await this.discoverVeralliaLinks($, catalogUrl));
      } else {
        // Generic product link discovery
        links.push(...await this.discoverGenericLinks($, catalogUrl));
      }

      return links;
    } catch (error) {
      throw new Error(`Failed to fetch catalog page: ${error.message}`);
    }
  }

  private async discoverVeralliaLinks($: cheerio.CheerioAPI, baseUrl: string): Promise<ProductLink[]> {
    const links: ProductLink[] = [];

    
    
    

    // Debug: Show sample of all links found
    const allHrefs: string[] = [];
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      if (href) allHrefs.push(href);
    });
    

    // For Verallia, try different approach - look for any links that could be products
    const allLinks: string[] = [];
    
    // First pass: Look for explicit product patterns
    $('a').each((_, element) => {
      const href = $(element).attr('href');
      const text = $(element).text().trim().toLowerCase();
      const title = $(element).attr('title')?.toLowerCase() || '';
      
      if (href && href.trim()) {
        // Verallia-specific patterns - look for category pages and products
        if (href.includes('.pdf') ||
            href.includes('bottle') ||
            href.includes('glass') ||
            href.includes('spirits') ||
            href.includes('product') ||
            href.includes('catalogue') ||
            href.includes('standardrange') ||
            href.includes('handled') ||
            href.includes('dump') ||
            href.includes('decanter') ||
            href.includes('wp-content/uploads') ||
            text.includes('bottle') ||
            text.includes('glass') ||
            text.includes('spirits') ||
            text.includes('pdf') ||
            text.includes('download') ||
            text.includes('view') ||
            text.includes('range') ||
            text.includes('handled') ||
            text.includes('dump') ||
            text.includes('decanter') ||
            title.includes('bottle') ||
            title.includes('glass') ||
            title.includes('product') ||
            title.includes('range')) {
          allLinks.push(href);
        }
      }
    });

    
    
    // If still no links, be even more permissive
    if (allLinks.length === 0) {
      
      $('a[href*="wp-content"], a[href*=".pdf"], a[href*="catalogue"]').each((_, element) => {
        const href = $(element).attr('href');
        if (href && href.trim()) {
          allLinks.push(href);
        }
      });
      
    }

    // Filter out unwanted links (Instagram, external sites, etc.)
    const filteredLinks = allLinks.filter(href => {
      // Skip social media and non-product links
      return !href.includes('instagram.com') && 
             !href.includes('facebook.com') && 
             !href.includes('twitter.com') && 
             !href.includes('linkedin.com') &&
             !href.includes('mailto:') &&
             !href.includes('tel:') &&
             !href.includes('#') &&
             href !== '/catalogue/' && // Skip generic catalogue link
             href.length > 10; // Skip very short links
    });

    

    // Process filtered links
    filteredLinks.forEach(href => {
      try {
        const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
        const linkElement = $(`a[href="${href}"]`).first();
        const title = linkElement.text().trim() || linkElement.attr('title') || `Product from ${href}`;
        
        if (!links.some(l => l.url === fullUrl)) {
          links.push({
            url: fullUrl,
            title: title,
            type: href.includes('.pdf') ? 'pdf' : 'product'
          });
        }
      } catch (error) {
        console.warn(`Skipping invalid URL: ${href}`);
      }
    });

    // Look for any PDF documents specifically
    $('a[href$=".pdf"], a[href*=".pdf"]').each((_, element) => {
      const href = $(element).attr('href');
      if (href) {
        try {
          const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          const title = $(element).text().trim() || 'Product Specification PDF';
          
          if (!links.some(l => l.url === fullUrl)) {
            links.push({
              url: fullUrl,
              title: title,
              type: 'pdf'
            });
          }
        } catch (error) {
          console.warn(`Skipping invalid PDF URL: ${href}`);
        }
      }
    });

    
    links.slice(0, 5).forEach((link, i) => {
      
    });

    return links;
  }

  private async discoverGenericLinks($: cheerio.CheerioAPI, baseUrl: string): Promise<ProductLink[]> {
    const links: ProductLink[] = [];
    
    // Generic selectors for product discovery
    const genericSelectors = [
      'a[href*="product"]',
      'a[href*="item"]',
      'a[href*="bottle"]',
      'a[href*="glass"]',
      '.product a',
      '.item a'
    ];

    genericSelectors.forEach(selector => {
      $(selector).each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).text().trim() || $(element).attr('title') || 'Unknown Product';

        if (href && !href.startsWith('#') && !href.startsWith('mailto:')) {
          const fullUrl = href.startsWith('http') ? href : new URL(href, baseUrl).toString();
          
          if (!links.find(l => l.url === fullUrl)) {
            links.push({ url: fullUrl, title });
          }
        }
      });
    });

    return links;
  }

  private async processProductLink(link: ProductLink, result: BulkImportResult): Promise<void> {
    try {
      let productData: any = null;
      let supplierData: any = null;

      // If we have a PDF, extract from PDF first
      if (link.pdfUrl) {
        try {
          const pdfData = await this.pdfExtractionService.extractProductDataFromUrl(link.pdfUrl);
          if (pdfData.success) {
            productData = pdfData.extractedData.productData;
            supplierData = pdfData.extractedData.supplierData;
            result.pdfsProcessed++;
          }
        } catch (error) {
          console.warn(`PDF extraction failed for ${link.pdfUrl}: ${error.message}`);
        }
      }

      // If we don't have data from PDF, try web scraping
      if (!productData || !supplierData) {
        try {
          const scrapedData = await WebScrapingService.scrapeProductData(link.url);
          if (scrapedData.success) {
            productData = productData || scrapedData.productData;
            supplierData = supplierData || scrapedData.supplierData;
          }
        } catch (error) {
          console.warn(`Web scraping failed for ${link.url}: ${error.message}`);
        }
      }

      // If we still don't have data, create minimal data from link
      if (!productData && !supplierData) {
        const domain = new URL(link.url).hostname;
        const companyName = this.extractCompanyNameFromDomain(domain);
        
        supplierData = {
          companyName,
          supplierType: 'Bottle Producer',
          website: `https://${domain}`,
          description: `Supplier discovered from ${domain}`
        };

        productData = {
          productName: link.title,
          description: `Product discovered from ${link.url}`,
          materialType: 'Glass'
        };
      }

      // Create supplier and product
      if (supplierData && productData) {
        const createResult = await SupplierProductService.createSupplierProduct({
          supplierData,
          productData,
          selectedImages: []
        });

        if (createResult) {
          if (createResult.isNewSupplier) {
            result.suppliersCreated++;
            result.results.push({
              type: 'supplier',
              name: supplierData.companyName || supplierData.supplierName || 'Unknown Supplier',
              source: link.url,
              success: true
            });
          }
          result.productsCreated++;
          result.results.push({
            type: 'product',
            name: productData.productName || link.title,
            source: link.url,
            success: true
          });
        } else {
          throw new Error(createResult.error || 'Failed to create supplier/product');
        }
      } else {
        throw new Error('No product or supplier data could be extracted');
      }

    } catch (error) {
      result.results.push({
        type: 'product',
        name: link.title,
        source: link.url,
        success: false,
        error: error.message
      });
      throw error;
    }
  }

  private extractCompanyNameFromDomain(domain: string): string {
    // Remove common prefixes and suffixes
    let name = domain
      .replace(/^www\./, '')
      .replace(/\.(com|co\.uk|net|org|eu)$/, '')
      .split('.')[0];

    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Method to handle specific catalog types
  async processSpecificCatalog(catalogUrl: string, catalogType?: 'verallia' | 'generic'): Promise<BulkImportResult> {
    // This can be extended to handle specific catalog formats
    return this.processCatalogPage(catalogUrl);
  }
}