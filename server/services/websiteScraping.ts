import * as cheerio from 'cheerio';

interface ScrapedCompanyInfo {
  name?: string;
  address?: string;
  contactDetails?: string;
  products: Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }>;
}

export class WebsiteScrapingService {
  private static readonly TIMEOUT = 10000; // 10 seconds
  private static readonly MAX_PRODUCTS = 10;

  static async scrapeCompanyInfo(url: string): Promise<ScrapedCompanyInfo> {
    try {
      // Ensure URL has protocol
      const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
      
      // Fetch the main page
      const response = await fetch(normalizedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SustainabilityBot/1.0)',
        },
        signal: AbortSignal.timeout(this.TIMEOUT)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract company information
      const result: ScrapedCompanyInfo = {
        products: []
      };

      // Extract company name
      result.name = this.extractCompanyName($);

      // Extract address
      result.address = this.extractAddress($);

      // Extract contact details
      result.contactDetails = this.extractContactDetails($);

      // Extract products
      result.products = await this.extractProducts($, normalizedUrl);

      return result;

    } catch (error) {
      console.error('Website scraping error:', error);
      throw new Error(`Failed to scrape website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static extractCompanyName($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for company name
    const selectors = [
      'h1',
      '.company-name',
      '.brand-name',
      '[data-testid*="company"]',
      'title',
      '.logo img[alt]',
      '.navbar-brand'
    ];

    for (const selector of selectors) {
      const text = $(selector).first().text().trim() || $(selector).first().attr('alt');
      if (text && text.length < 100) {
        return text.replace(/\s+/g, ' ');
      }
    }

    return undefined;
  }

  private static extractAddress($: cheerio.CheerioAPI): string | undefined {
    // Try multiple selectors for address
    const selectors = [
      '[data-testid*="address"]',
      '.address',
      '.contact-info',
      '*:contains("Address")',
      '*:contains("Location")',
      'address'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        let text = element.text().trim();
        if (text.length > 10 && text.length < 200) {
          return text.replace(/\s+/g, ' ');
        }
      }
    }

    return undefined;
  }

  private static extractContactDetails($: cheerio.CheerioAPI): string | undefined {
    // Extract email and phone
    const contacts = [];

    // Email extraction
    const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
    const bodyText = $('body').text();
    const emails = bodyText.match(emailRegex) || [];
    if (emails.length > 0) {
      contacts.push(`Email: ${emails[0]}`);
    }

    // Phone extraction
    const phoneRegex = /(\+\d{1,4}\s?)?(\(?\d{1,4}\)?\s?)?[\d\s\-\.]{6,}/g;
    const phones = bodyText.match(phoneRegex) || [];
    if (phones.length > 0 && phones[0]) {
      const cleanPhone = phones[0].replace(/\s+/g, ' ').trim();
      if (cleanPhone.length >= 6 && cleanPhone.length <= 20) {
        contacts.push(`Phone: ${cleanPhone}`);
      }
    }

    return contacts.length > 0 ? contacts.join(', ') : undefined;
  }

  private static async extractProducts($: cheerio.CheerioAPI, baseUrl: string): Promise<Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }>> {
    const products: Array<{
      name: string;
      category?: string;
      imageUrl?: string;
      isPrimary: boolean;
    }> = [];
    const foundNames = new Set<string>();

    // Try multiple selectors for products
    const productSelectors = [
      '.product',
      '.product-card',
      '.product-item',
      '[data-testid*="product"]',
      '.shop-item',
      '.drink',
      '.bottle'
    ];

    for (const selector of productSelectors) {
      const elements = $(selector);
      elements.each((i, elem) => {
        if (products.length >= this.MAX_PRODUCTS) return false;

        const $elem = $(elem);
        
        // Extract product name
        const nameSelectors = ['h1', 'h2', 'h3', '.product-name', '.name', '.title', 'img[alt]'];
        let name = '';
        
        for (const nameSelector of nameSelectors) {
          const nameText = $elem.find(nameSelector).first().text().trim() || 
                          $elem.find(nameSelector).first().attr('alt') || '';
          if (nameText && nameText.length < 100) {
            name = nameText;
            break;
          }
        }

        if (name && !foundNames.has(name.toLowerCase())) {
          foundNames.add(name.toLowerCase());

          // Extract image URL
          const img = $elem.find('img').first();
          let imageUrl = img.attr('src') || img.attr('data-src');
          if (imageUrl && !imageUrl.startsWith('http')) {
            try {
              imageUrl = new URL(imageUrl, baseUrl).href;
            } catch {
              imageUrl = undefined;
            }
          }

          // Determine category (basic heuristics)
          const category: string | undefined = this.guessProductCategory(name, $elem.text());

          products.push({
            name: name.replace(/\s+/g, ' '),
            category,
            imageUrl,
            isPrimary: i === 0 // First product is primary
          });
        }
      });

      if (products.length >= this.MAX_PRODUCTS) break;
    }

    return products;
  }

  private static guessProductCategory(name: string, context: string): string | undefined {
    const text = (name + ' ' + context).toLowerCase();
    
    const categories = {
      'wine': ['wine', 'pinot', 'chardonnay', 'cabernet', 'merlot', 'sauvignon'],
      'beer': ['beer', 'ale', 'lager', 'ipa', 'stout', 'pilsner'],
      'spirit': ['whiskey', 'whisky', 'vodka', 'gin', 'rum', 'tequila', 'brandy'],
      'non-alcoholic': ['non-alcoholic', 'alcohol-free', 'zero percent', '0%'],
      'cider': ['cider', 'apple wine'],
      'liqueur': ['liqueur', 'cream', 'coffee liqueur']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }
}