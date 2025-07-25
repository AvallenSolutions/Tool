import * as cheerio from 'cheerio';

export interface ExtractedSupplierData {
  companyName?: string;
  supplierType?: string;
  description?: string;
  address?: string;
  website?: string;
  email?: string;
  confidence?: {
    [key: string]: number; // 0-1 confidence score for each extracted field
  };
}

export interface ExtractedProductData {
  productName?: string;
  description?: string;
  materialType?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    height?: number;
    width?: number;
    depth?: number;
    unit?: string;
  };
  recycledContent?: number;
  capacity?: number;
  capacityUnit?: string;
  color?: string;
  certifications?: string[];
  price?: number;
  currency?: string;
  sku?: string;
  productImage?: string; // URL to the main product image
  additionalImages?: string[]; // URLs to additional product images
  confidence?: {
    [key: string]: number; // 0-1 confidence score for each extracted field
  };
}

export interface ScrapingResult {
  success: boolean;
  productData?: ExtractedProductData;
  supplierData?: ExtractedSupplierData;
  error?: string;
  extractedFields: string[];
  totalFields: number;
  images?: string[]; // All found product images
}

export class WebScrapingService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB

  // Common patterns for product and supplier attributes
  private static readonly PATTERNS = {
    // Product patterns
    weight: [
      /weight[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|grams?|kilograms?|lbs?|pounds?)/i,
      /(\d+(?:\.\d+)?)\s*(g|kg|grams?|kilograms?|lbs?|pounds?)\s*weight/i,
      /mass[:\s]*(\d+(?:\.\d+)?)\s*(g|kg|grams?|kilograms?)/i
    ],
    capacity: [
      /capacity[:\s]*(\d+(?:\.\d+)?)\s*(ml|l|liters?|milliliters?|oz|fl\.?\s*oz)/i,
      /volume[:\s]*(\d+(?:\.\d+)?)\s*(ml|l|liters?|milliliters?|oz|fl\.?\s*oz)/i,
      /(\d+(?:\.\d+)?)\s*(ml|l|liters?|milliliters?|oz|fl\.?\s*oz)\s*capacity/i
    ],
    material: [
      /material[:\s]*([a-zA-Z\s]+?)(?:\.|,|;|$)/i,
      /made\s+(?:of|from)[:\s]*([a-zA-Z\s]+?)(?:\.|,|;|$)/i,
      /(?:glass|plastic|aluminum|steel|wood|ceramic|metal|paper|cardboard)/i
    ],
    dimensions: [
      /dimensions?[:\s]*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inches?)/i,
      /(?:h|height)[:\s]*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inches?)/i,
      /(?:w|width)[:\s]*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inches?)/i,
      /(?:d|depth|diameter)[:\s]*(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inches?)/i
    ],
    recycledContent: [
      /recycled[:\s]*(\d+(?:\.\d+)?)\s*%/i,
      /(\d+(?:\.\d+)?)\s*%\s*recycled/i,
      /post[- ]consumer[:\s]*(\d+(?:\.\d+)?)\s*%/i
    ],
    certifications: [
      /(?:certified|certification)[:\s]*([a-zA-Z0-9\s,]+?)(?:\.|$)/i,
      /(?:iso|fsc|organic|fair\s*trade|bpa[- ]free|food[- ]grade)/i
    ],
    
    // Supplier patterns
    companyName: [
      /<title[^>]*>([^<]+?)(?:\s*[-|]|\s*$)/i,
      /(?:company|corporation|corp\.?|ltd\.?|llc|inc\.?)[:\s]*([^<>\n]+)/i,
      /(?:about\s+)?([^<>\n]{5,50})(?:\s*[-|]\s*(?:home|welcome|official|website))/i
    ],
    email: [
      /(?:email|contact|e-mail)[:\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
    ],
    phone: [
      /(?:phone|tel|telephone)[:\s]*([+]?[\d\s\-\(\)\.]{10,})/i,
      /([+]?[\d\s\-\(\)\.]{10,})/g
    ],
    address: [
      /(?:address|location)[:\s]*([^<>\n]{10,100})/i,
      /(\d+[^<>\n]{5,80}(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?))/i
    ],
    supplierType: [
      /(?:manufacturer|producer|supplier|distributor|packaging|bottle|label|closure|ingredient)/i
    ]
  };

  static async scrapeProductData(url: string): Promise<ScrapingResult> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        return {
          success: false,
          error: 'Invalid URL provided',
          extractedFields: [],
          totalFields: 0
        };
      }

      // Fetch page content using native fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SustainabilityBot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive',
        }
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: Could not fetch page content`,
          extractedFields: [],
          totalFields: 0
        };
      }

      // Parse HTML
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Extract both product and supplier data
      const extractedProductData = this.extractProductAttributes($);
      const extractedSupplierData = this.extractSupplierAttributes($, url);
      
      // Extract product images
      const images = this.extractProductImages($, url);
      if (images.length > 0) {
        extractedProductData.productImage = images[0]; // Primary image
        if (images.length > 1) {
          extractedProductData.additionalImages = images.slice(1, 5); // Up to 4 additional images
        }
      }
      
      // Calculate confidence and success metrics
      const productFields = Object.keys(extractedProductData).filter(key => 
        extractedProductData[key as keyof ExtractedProductData] !== undefined && 
        key !== 'confidence'
      );
      
      const supplierFields = Object.keys(extractedSupplierData).filter(key => 
        extractedSupplierData[key as keyof ExtractedSupplierData] !== undefined && 
        key !== 'confidence'
      );
      
      const totalExtractedFields = [...productFields, ...supplierFields.map(f => `supplier_${f}`)];
      const totalPossibleFields = 20; // Approximate total of all possible fields

      return {
        success: totalExtractedFields.length > 0,
        productData: productFields.length > 0 ? extractedProductData : undefined,
        supplierData: supplierFields.length > 0 ? extractedSupplierData : undefined,
        extractedFields: totalExtractedFields,
        totalFields: totalPossibleFields,
        images,
        error: totalExtractedFields.length === 0 ? 'No product or supplier data could be extracted from the provided URL' : undefined
      };

    } catch (error) {
      console.error('Scraping error:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return {
            success: false,
            error: 'Request timed out. The website may be slow or unresponsive.',
            extractedFields: [],
            totalFields: 0
          };
        }
        if (error.message.includes('fetch')) {
          return {
            success: false,
            error: 'Could not connect to the provided URL. Please check the URL is correct and accessible.',
            extractedFields: [],
            totalFields: 0
          };
        }
      }

      return {
        success: false,
        error: 'An unexpected error occurred while processing the URL',
        extractedFields: [],
        totalFields: 0
      };
    }
  }

  private static extractProductAttributes($: cheerio.CheerioAPI): ExtractedProductData {
    const data: ExtractedProductData = {
      confidence: {}
    };

    // Get all text content for pattern matching
    const fullText = $('body').text().toLowerCase();
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    
    // Extract product name from title, h1, or meta
    const title = $('title').text().trim();
    const h1 = $('h1').first().text().trim();
    const productNameMeta = $('meta[property="og:title"]').attr('content') || 
                           $('meta[name="product:name"]').attr('content');
    
    if (productNameMeta) {
      data.productName = productNameMeta;
      data.confidence!.productName = 0.9;
    } else if (h1) {
      data.productName = h1;
      data.confidence!.productName = 0.8;
    } else if (title) {
      data.productName = title;
      data.confidence!.productName = 0.6;
    }

    // Extract description
    if (metaDescription) {
      data.description = metaDescription;
      data.confidence!.description = 0.8;
    } else {
      const descriptionEl = $('.description, .product-description, .summary').first();
      if (descriptionEl.length) {
        data.description = descriptionEl.text().trim().substring(0, 500);
        data.confidence!.description = 0.7;
      }
    }

    // Extract weight
    for (const pattern of this.PATTERNS.weight) {
      const match = fullText.match(pattern);
      if (match) {
        data.weight = parseFloat(match[1]);
        data.weightUnit = this.normalizeUnit(match[2]);
        data.confidence!.weight = 0.8;
        break;
      }
    }

    // Extract capacity/volume
    for (const pattern of this.PATTERNS.capacity) {
      const match = fullText.match(pattern);
      if (match) {
        data.capacity = parseFloat(match[1]);
        data.capacityUnit = this.normalizeUnit(match[2]);
        data.confidence!.capacity = 0.8;
        break;
      }
    }

    // Extract material
    for (const pattern of this.PATTERNS.material) {
      const match = fullText.match(pattern);
      if (match) {
        if (match[1]) {
          data.materialType = match[1].trim();
          data.confidence!.materialType = 0.7;
        } else {
          // Direct material match
          const materials = ['glass', 'plastic', 'aluminum', 'steel', 'wood', 'ceramic', 'metal', 'paper', 'cardboard'];
          const foundMaterial = materials.find(mat => fullText.includes(mat));
          if (foundMaterial) {
            data.materialType = foundMaterial;
            data.confidence!.materialType = 0.6;
          }
        }
        break;
      }
    }

    // Extract dimensions
    for (const pattern of this.PATTERNS.dimensions) {
      const match = fullText.match(pattern);
      if (match) {
        if (match.length >= 5) {
          // Full dimensions
          data.dimensions = {
            height: parseFloat(match[1]),
            width: parseFloat(match[2]),
            depth: parseFloat(match[3]),
            unit: this.normalizeUnit(match[4])
          };
          data.confidence!.dimensions = 0.8;
        } else {
          // Single dimension
          if (!data.dimensions) data.dimensions = {};
          if (pattern.source.includes('height')) {
            data.dimensions.height = parseFloat(match[1]);
            data.dimensions.unit = this.normalizeUnit(match[2]);
          } else if (pattern.source.includes('width')) {
            data.dimensions.width = parseFloat(match[1]);
            data.dimensions.unit = this.normalizeUnit(match[2]);
          }
          data.confidence!.dimensions = 0.6;
        }
        break;
      }
    }

    // Extract recycled content
    for (const pattern of this.PATTERNS.recycledContent) {
      const match = fullText.match(pattern);
      if (match) {
        data.recycledContent = parseFloat(match[1]);
        data.confidence!.recycledContent = 0.8;
        break;
      }
    }

    // Extract certifications
    const certifications: string[] = [];
    const certPatterns = ['iso', 'fsc', 'organic', 'fair trade', 'bpa free', 'food grade'];
    for (const cert of certPatterns) {
      if (fullText.includes(cert)) {
        certifications.push(cert.replace(/\b\w/g, l => l.toUpperCase()));
      }
    }
    if (certifications.length > 0) {
      data.certifications = certifications;
      data.confidence!.certifications = 0.6;
    }

    // Extract SKU from various locations
    const skuSelectors = [
      '[data-sku]',
      '.sku',
      '.product-sku',
      '.item-number',
      '[class*="sku"]'
    ];
    
    for (const selector of skuSelectors) {
      const skuEl = $(selector);
      if (skuEl.length) {
        const skuText = skuEl.text().trim() || skuEl.attr('data-sku') || '';
        if (skuText) {
          data.sku = skuText;
          data.confidence!.sku = 0.7;
          break;
        }
      }
    }

    return data;
  }

  private static extractSupplierAttributes($: cheerio.CheerioAPI, url: string): ExtractedSupplierData {
    const data: ExtractedSupplierData = {
      confidence: {}
    };

    // Get all text content for pattern matching
    const fullText = $('body').text().toLowerCase();
    
    // Extract company name from title, header, or meta
    const title = $('title').text().trim();
    const companyMeta = $('meta[property="og:site_name"]').attr('content') || 
                       $('meta[name="author"]').attr('content');
    
    // Parse company name from title (remove common suffixes)
    if (companyMeta) {
      data.companyName = companyMeta;
      data.confidence!.companyName = 0.9;
    } else if (title) {
      // Extract company name from title, removing common patterns
      const cleanTitle = title
        .replace(/\s*[-|]\s*(home|welcome|official|website|products).*$/i, '')
        .replace(/\s*[-|]\s*.*$/, '')
        .trim();
      if (cleanTitle.length > 2 && cleanTitle.length < 50) {
        data.companyName = cleanTitle;
        data.confidence!.companyName = 0.7;
      }
    }

    // Extract from domain if no company name found
    if (!data.companyName) {
      try {
        const domain = new URL(url).hostname.replace('www.', '');
        const domainParts = domain.split('.');
        if (domainParts.length > 0) {
          data.companyName = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
          data.confidence!.companyName = 0.5;
        }
      } catch (e) {
        // Ignore URL parsing errors
      }
    }

    // Set website from URL
    data.website = url;
    data.confidence!.website = 1.0;

    // Extract email addresses
    const emailMatches = fullText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
    if (emailMatches && emailMatches.length > 0) {
      // Filter out common non-contact emails
      const contactEmail = emailMatches.find(email => 
        !email.includes('noreply') && 
        !email.includes('no-reply') &&
        !email.includes('donotreply') &&
        (email.includes('info') || email.includes('contact') || email.includes('sales') || email.includes('hello'))
      ) || emailMatches[0];
      
      data.email = contactEmail;
      data.confidence!.email = contactEmail.includes('info') || contactEmail.includes('contact') ? 0.8 : 0.6;
    }

    // Extract address from contact sections
    const contactSections = $('.contact, .address, .location, [class*="contact"], [class*="address"]');
    contactSections.each((_, element) => {
      const text = $(element).text();
      const addressMatch = text.match(/(\d+[^<>\n]{10,80}(?:street|st\.?|avenue|ave\.?|road|rd\.?|lane|ln\.?|drive|dr\.?))/i);
      if (addressMatch && !data.address) {
        data.address = addressMatch[1].trim();
        data.confidence!.address = 0.7;
      }
    });

    // Extract supplier type from content analysis
    const supplierTypes = [
      { keywords: ['bottle', 'bottles', 'glass', 'container'], type: 'Bottle Producer' },
      { keywords: ['label', 'labels', 'printing', 'design'], type: 'Label Maker' },
      { keywords: ['closure', 'closures', 'cap', 'caps', 'cork'], type: 'Closure Producer' },
      { keywords: ['packaging', 'box', 'boxes', 'carton'], type: 'Packaging Supplier' },
      { keywords: ['ingredient', 'ingredients', 'flavor', 'essence'], type: 'Ingredient Supplier' },
      { keywords: ['distillery', 'distilling', 'production', 'manufacturing'], type: 'Contract Manufacturer' },
      { keywords: ['supplier', 'wholesale', 'distributor'], type: 'General Supplier' }
    ];

    for (const typeInfo of supplierTypes) {
      const hasKeyword = typeInfo.keywords.some(keyword => fullText.includes(keyword));
      if (hasKeyword) {
        data.supplierType = typeInfo.type;
        data.confidence!.supplierType = 0.7;
        break;
      }
    }

    // Extract description from meta description or about sections
    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription) {
      data.description = metaDescription.substring(0, 300);
      data.confidence!.description = 0.8;
    } else {
      const aboutSections = $('.about, .description, .company, [class*="about"], [class*="company"]');
      if (aboutSections.length > 0) {
        const aboutText = aboutSections.first().text().trim().substring(0, 300);
        if (aboutText.length > 20) {
          data.description = aboutText;
          data.confidence!.description = 0.6;
        }
      }
    }

    return data;
  }

  private static extractProductImages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const images: string[] = [];
    const imageSelectors = [
      'img[src]',  // All images with src attribute
      'img[data-src]', // Lazy loaded images
      'img[class*="product"]',
      'img[class*="main"]',
      'img[id*="product"]',
      '.product-image img',
      '.product-photo img',
      '.main-image img',
      '[class*="gallery"] img',
      '[class*="slideshow"] img',
      '[class*="hero"] img',
      'picture img',
      'figure img',
      'meta[property="og:image"]',
      'meta[name="twitter:image"]'
    ];

    // Extract images from various selectors
    imageSelectors.forEach(selector => {
      if (selector.startsWith('meta')) {
        const metaImage = $(selector).attr('content');
        if (metaImage) {
          images.push(this.resolveImageUrl(metaImage, baseUrl));
        }
      } else {
        $(selector).each((_, element) => {
          const imgElement = $(element);
          const imgSrc = imgElement.attr('src') || 
                        imgElement.attr('data-src') || 
                        imgElement.attr('data-lazy') ||
                        imgElement.attr('data-original') ||
                        imgElement.attr('data-lazy-src');
          if (imgSrc) {
            images.push(this.resolveImageUrl(imgSrc, baseUrl));
          }
        });
      }
    });

    // Also try to find images from CSS background-image properties
    $('[style*="background-image"]').each((_, element) => {
      const style = $(element).attr('style');
      if (style) {
        const bgMatch = style.match(/background-image:\s*url\(['"]?([^'"]+)['"]?\)/);
        if (bgMatch && bgMatch[1]) {
          images.push(this.resolveImageUrl(bgMatch[1], baseUrl));
        }
      }
    });

    // Filter out invalid images and duplicates
    const validImages = images
      .filter(img => img && img.length > 0)
      .filter(img => this.isValidImageUrl(img))
      .filter((img, index, arr) => arr.indexOf(img) === index) // Remove duplicates
      .slice(0, 5); // Limit to 5 images

    console.log(`Image extraction debug for ${baseUrl}:`);
    console.log(`- Found ${images.length} total images`);
    console.log(`- Valid images after filtering: ${validImages.length}`);
    console.log(`- Sample images:`, images.slice(0, 3));

    return validImages;
  }

  private static resolveImageUrl(imageSrc: string, baseUrl: string): string {
    try {
      if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
        return imageSrc;
      }
      
      const base = new URL(baseUrl);
      if (imageSrc.startsWith('//')) {
        return base.protocol + imageSrc;
      }
      
      if (imageSrc.startsWith('/')) {
        return base.origin + imageSrc;
      }
      
      return new URL(imageSrc, baseUrl).href;
    } catch (error) {
      console.warn('Failed to resolve image URL:', imageSrc, error);
      return imageSrc;
    }
  }

  private static isValidImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();
      
      // Check for common image extensions
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasImageExtension = imageExtensions.some(ext => pathname.endsWith(ext));
      
      // Check for image-like patterns in URL
      const hasImagePattern = pathname.includes('image') || 
                             pathname.includes('photo') || 
                             pathname.includes('product') ||
                             url.includes('image') ||
                             url.includes('photo');
      
      // Exclude obvious non-product images
      const excludePatterns = ['logo', 'icon', 'favicon', 'avatar', 'thumbnail'];
      const hasExcludePattern = excludePatterns.some(pattern => 
        url.toLowerCase().includes(pattern));
      
      return (hasImageExtension || hasImagePattern) && !hasExcludePattern;
    } catch (error) {
      return false;
    }
  }

  private static normalizeUnit(unit: string): string {
    const normalized = unit.toLowerCase().trim();
    
    // Weight units
    if (['g', 'gram', 'grams'].includes(normalized)) return 'g';
    if (['kg', 'kilogram', 'kilograms'].includes(normalized)) return 'kg';
    if (['lb', 'lbs', 'pound', 'pounds'].includes(normalized)) return 'lbs';
    
    // Volume units
    if (['ml', 'milliliter', 'milliliters'].includes(normalized)) return 'ml';
    if (['l', 'liter', 'liters'].includes(normalized)) return 'l';
    if (['oz', 'fl oz', 'fl. oz'].includes(normalized)) return 'fl oz';
    
    // Length units
    if (['mm', 'millimeter', 'millimeters'].includes(normalized)) return 'mm';
    if (['cm', 'centimeter', 'centimeters'].includes(normalized)) return 'cm';
    if (['m', 'meter', 'meters'].includes(normalized)) return 'm';
    if (['in', 'inch', 'inches'].includes(normalized)) return 'in';
    
    return normalized;
  }

  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }
}