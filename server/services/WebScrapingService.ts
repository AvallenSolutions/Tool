import * as cheerio from 'cheerio';

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
  confidence?: {
    [key: string]: number; // 0-1 confidence score for each extracted field
  };
}

export interface ScrapingResult {
  success: boolean;
  data?: ExtractedProductData;
  error?: string;
  extractedFields: string[];
  totalFields: number;
}

export class WebScrapingService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_CONTENT_LENGTH = 5 * 1024 * 1024; // 5MB

  // Common patterns for product attributes
  private static readonly PATTERNS = {
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
      
      // Extract data using multiple strategies
      const extractedData = this.extractProductAttributes($);
      
      // Calculate confidence and success metrics
      const extractedFields = Object.keys(extractedData).filter(key => 
        extractedData[key as keyof ExtractedProductData] !== undefined && 
        key !== 'confidence'
      );
      
      const totalPossibleFields = Object.keys(this.PATTERNS).length + 3; // +3 for name, description, sku

      return {
        success: extractedFields.length > 0,
        data: extractedFields.length > 0 ? extractedData : undefined,
        extractedFields,
        totalFields: totalPossibleFields,
        error: extractedFields.length === 0 ? 'No product data could be extracted from the provided URL' : undefined
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