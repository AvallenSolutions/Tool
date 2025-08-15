import * as cheerio from 'cheerio';

export interface ScrapedCompanyInfo {
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
  private static readonly MAX_PRODUCTS = 20; // Increased for multi-page scraping
  private static readonly MAX_PAGES = 8; // Max sub-pages to crawl
  private static readonly REQUEST_DELAY = 1000; // 1 second delay between requests

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
      result.address = await this.extractAddress($, normalizedUrl);

      // Extract contact details
      result.contactDetails = this.extractContactDetails($);

      // Phase 2: Category-First Product Discovery
      // Step 1: Determine primary category
      const primaryCategory = this.determinePrimaryCategory($, normalizedUrl);
      
      // Step 2: Find product/shop pages
      const productPages = await this.findProductPages($, normalizedUrl, primaryCategory);
      
      // Step 3: Extract validated products from category-specific pages
      result.products = await this.extractValidatedProducts(productPages, primaryCategory, normalizedUrl);

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

  private static async extractAddress($: cheerio.CheerioAPI, baseUrl: string): Promise<string | undefined> {
    // Step 1: Prioritize Contact/About pages
    let targetPage$ = await this.findContactOrAboutPage($, baseUrl);
    if (!targetPage$) {
      // Fallback: Use footer of homepage
      const footerContent = $('footer').html();
      if (footerContent) {
        targetPage$ = cheerio.load(footerContent);
      } else {
        targetPage$ = $; // Use main page as last resort
      }
    }

    // Step 2: Identify country context
    const country = this.identifyCountry(targetPage$);

    // Step 3: Use country-specific regex patterns
    const address = this.extractAddressWithRegex(targetPage$, country);
    
    if (address) {
      // Step 4: Clean and validate the address
      return this.cleanPhysicalAddress(address);
    }

    return undefined;
  }

  private static async findContactOrAboutPage($: cheerio.CheerioAPI, baseUrl: string): Promise<cheerio.CheerioAPI | null> {
    const contactPatterns = /contact|about\s*us|about/i;
    const links: string[] = [];

    // Look for contact/about links
    $('a[href]').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const linkText = $link.text().toLowerCase().trim();
      
      if (href && (contactPatterns.test(linkText) || contactPatterns.test(href))) {
        try {
          const fullUrl = new URL(href, baseUrl).href;
          if (fullUrl.startsWith(new URL(baseUrl).origin)) {
            links.push(fullUrl);
          }
        } catch {
          // Skip malformed URLs
        }
      }
    });

    // Try to fetch the first contact/about page found
    if (links.length > 0) {
      try {
        const response = await fetch(links[0], {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SustainabilityBot/1.0)' },
          signal: AbortSignal.timeout(this.TIMEOUT)
        });
        
        if (response.ok) {
          const html = await response.text();
          return cheerio.load(html);
        }
      } catch {
        // Failed to fetch, continue with fallback
      }
    }

    return null;
  }

  private static identifyCountry($: cheerio.CheerioAPI): string {
    const text = $('body').text().toLowerCase();
    
    const countryPatterns = {
      'united kingdom': /\b(united kingdom|uk|britain|england|scotland|wales|northern ireland)\b/i,
      'france': /\b(france|français|french)\b/i,
      'germany': /\b(germany|deutschland|german)\b/i,
      'usa': /\b(united states|usa|america|american)\b/i,
      'seychelles': /\b(seychelles|seychellois)\b/i,
      'australia': /\b(australia|australian|aussie)\b/i,
      'canada': /\b(canada|canadian)\b/i
    };

    for (const [country, pattern] of Object.entries(countryPatterns)) {
      if (pattern.test(text)) {
        return country;
      }
    }

    return 'unknown';
  }

  private static extractAddressWithRegex($: cheerio.CheerioAPI, country: string): string | undefined {
    const text = $('body').text();

    const postcodePatterns: Record<string, RegExp> = {
      'united kingdom': /([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})/i,
      'france': /(\d{5})/,
      'germany': /(\d{5})/,
      'usa': /(\d{5}(-\d{4})?)/,
      'seychelles': /([A-Z0-9]{3,8})/i, // General pattern for Seychelles
      'australia': /(\d{4})/,
      'canada': /([A-Z]\d[A-Z]\s?\d[A-Z]\d)/i
    };

    const pattern = postcodePatterns[country] || postcodePatterns['usa']; // Default to US pattern
    const match = text.match(pattern);

    if (match) {
      const postcodePosition = text.indexOf(match[0]);
      
      // Extract surrounding lines (2-4 lines before the postcode)
      const beforeText = text.substring(Math.max(0, postcodePosition - 500), postcodePosition);
      const afterText = text.substring(postcodePosition, postcodePosition + 200);
      
      const lines = (beforeText + match[0] + afterText)
        .split(/[\n\r]/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      // Find the line with the postcode and include 2-3 lines before it
      const postcodeLineIndex = lines.findIndex(line => line.includes(match[0]));
      if (postcodeLineIndex >= 0) {
        const startIndex = Math.max(0, postcodeLineIndex - 3);
        const addressLines = lines.slice(startIndex, postcodeLineIndex + 1);
        return addressLines.join('\n');
      }
    }

    return undefined;
  }

  private static cleanPhysicalAddress(address: string): string {
    const lines = address.split(/[\n\r]/)
      .map(line => line.trim())
      .filter(line => {
        // Remove lines with emails
        if (line.includes('@')) return false;
        
        // Remove lines with phone patterns
        if (/(\+?\d{1,4}[\s\-\(\)])?[\d\s\-\(\)]{6,}/.test(line)) return false;
        
        // Remove lines that are just labels
        if (/^(address|location|contact|tel|phone|email)[\s:]*$/i.test(line)) return false;
        
        // Keep lines that look like address components
        return line.length > 2 && line.length < 100;
      });

    return lines.join(', ').replace(/\s+/g, ' ').trim();
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

  private static determinePrimaryCategory($: cheerio.CheerioAPI, baseUrl: string): string {
    // Step 1: Create keyword dictionaries
    const categoryKeywords = {
      'spirits': ['rum', 'gin', 'whisky', 'whiskey', 'vodka', 'tequila', 'brandy', 'calvados', 'cognac', 'armagnac', 'bourbon', 'rye', 'scotch', 'mezcal', 'absinthe', 'grappa', 'schnapps'],
      'wine': ['wine', 'red', 'white', 'rosé', 'rose', 'merlot', 'chardonnay', 'prosecco', 'champagne', 'pinot', 'cabernet', 'sauvignon', 'riesling', 'shiraz', 'vintage', 'vineyard', 'winery'],
      'beer': ['beer', 'lager', 'ale', 'stout', 'ipa', 'pilsner', 'porter', 'wheat', 'bitter', 'mild', 'brewery', 'brewing', 'hops', 'malt'],
      'cider': ['cider', 'apple wine', 'perry', 'scrumpy', 'cidery', 'orchard']
    };

    // Step 2: Scan for keywords and count occurrences
    const text = $('body').text().toLowerCase();
    const navText = $('nav, .navbar, .menu, .navigation').text().toLowerCase();
    const combinedText = text + ' ' + navText;

    const categoryCounts: Record<string, number> = {};

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      categoryCounts[category] = 0;
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const matches = combinedText.match(regex);
        if (matches) {
          categoryCounts[category] += matches.length;
        }
      }
    }

    // Step 3: Determine primary category with highest count
    let primaryCategory = 'other';
    let maxCount = 0;

    for (const [category, count] of Object.entries(categoryCounts)) {
      if (count > maxCount) {
        maxCount = count;
        primaryCategory = category;
      }
    }

    return primaryCategory;
  }

  private static async findProductPages($: cheerio.CheerioAPI, baseUrl: string, primaryCategory: string): Promise<Array<{ url: string, $: cheerio.CheerioAPI }>> {
    const productPages: Array<{ url: string, $: cheerio.CheerioAPI }> = [];
    
    // Step 1: Look for product/shop navigation links
    const productPatterns = [
      /products?/i, /shop/i, /our\s*range/i, /collection/i, /catalog/i, /store/i,
      new RegExp(`our\\s*${primaryCategory}`, 'i'), // e.g., "Our Rum"
      new RegExp(primaryCategory, 'i') // Category name itself
    ];

    const links: string[] = [];
    
    $('nav a, .menu a, .navbar a, a').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const linkText = $link.text().toLowerCase().trim();
      
      if (href && links.length < 3) { // Limit to 3 product pages
        const isProductLink = productPatterns.some(pattern => 
          pattern.test(linkText) || pattern.test(href)
        );
        
        if (isProductLink) {
          try {
            const fullUrl = new URL(href, baseUrl).href;
            if (fullUrl.startsWith(new URL(baseUrl).origin) && !links.includes(fullUrl)) {
              links.push(fullUrl);
            }
          } catch {
            // Skip malformed URLs
          }
        }
      }
    });

    // Add main page as fallback if no product pages found
    if (links.length === 0) {
      links.push(baseUrl);
    }

    // Fetch each product page
    for (const url of links) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
        
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SustainabilityBot/1.0)' },
          signal: AbortSignal.timeout(this.TIMEOUT)
        });

        if (response.ok) {
          const html = await response.text();
          productPages.push({ url, $: cheerio.load(html) });
        }
      } catch (error) {
        console.warn(`Failed to fetch product page ${url}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return productPages;
  }

  private static async extractValidatedProducts(
    productPages: Array<{ url: string, $: cheerio.CheerioAPI }>,
    primaryCategory: string,
    baseUrl: string
  ): Promise<Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }>> {
    const validProducts: Array<{
      name: string;
      category?: string;
      imageUrl?: string;
      isPrimary: boolean;
    }> = [];
    const foundNames = new Set<string>();

    // Get category keywords for validation
    const categoryKeywords = this.getCategoryKeywords(primaryCategory);

    for (const { url, $ } of productPages) {
      // Step 2: Scrape potential product titles
      const titleSelectors = [
        'h1', 'h2', 'h3', 'h4', 
        '.product-title', '.product-name', '.bottle-name', '.drink-name',
        '.name', '.title', '.heading',
        '[data-product-name]', '[data-title]'
      ];

      for (const selector of titleSelectors) {
        if (validProducts.length >= this.MAX_PRODUCTS) break;

        $(selector).each((i, elem) => {
          if (validProducts.length >= this.MAX_PRODUCTS) return false;

          const $elem = $(elem);
          const title = $elem.text().trim();

          // Step 3: Filter and validate products
          if (title && title.length > 2 && title.length < 150) {
            const isValidProduct = this.isValidProductForCategory(title, categoryKeywords, primaryCategory);
            
            if (isValidProduct && !foundNames.has(title.toLowerCase())) {
              foundNames.add(title.toLowerCase());

              // Step 4: Extract product images
              const img = $elem.closest('div, section, article').find('img').first();
              let imageUrl = img.attr('src') || img.attr('data-src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                try {
                  imageUrl = new URL(imageUrl, baseUrl).href;
                } catch {
                  imageUrl = undefined;
                }
              }

              validProducts.push({
                name: title,
                category: primaryCategory,
                imageUrl,
                isPrimary: i === 0
              });
            }
          }
        });
      }
    }

    return validProducts;
  }

  private static getCategoryKeywords(category: string): string[] {
    const keywordMap: Record<string, string[]> = {
      'spirits': ['rum', 'gin', 'whisky', 'whiskey', 'vodka', 'tequila', 'brandy', 'calvados', 'bourbon', 'scotch', 'rye', 'irish', 'single malt', 'blended', 'aged', 'proof', 'distilled', 'cask', 'barrel', 'reserve', 'premium', 'craft', 'dark', 'white', 'gold', 'spiced', 'overproof'],
      'wine': ['wine', 'red', 'white', 'rosé', 'rose', 'sparkling', 'vintage', 'reserve', 'estate', 'organic', 'merlot', 'chardonnay', 'cabernet', 'pinot', 'sauvignon', 'riesling', 'shiraz'],
      'beer': ['beer', 'ale', 'lager', 'ipa', 'stout', 'porter', 'pilsner', 'wheat', 'pale', 'brown', 'amber', 'bitter', 'mild', 'session', 'craft', 'brewing', 'brewed'],
      'cider': ['cider', 'apple', 'perry', 'dry', 'sweet', 'sparkling', 'traditional', 'craft', 'scrumpy']
    };

    return keywordMap[category] || [];
  }

  private static isValidProductForCategory(title: string, categoryKeywords: string[], primaryCategory: string): boolean {
    const titleLower = title.toLowerCase();
    
    // Exclude obvious non-products
    const excludePatterns = [
      /^(about|contact|home|news|blog|faq)/i,
      /^(tripadvisor|facebook|instagram|twitter|youtube)/i,
      /^(privacy|terms|policy|cookies)/i,
      /^(search|filter|sort|view)/i
    ];

    if (excludePatterns.some(pattern => pattern.test(title))) {
      return false;
    }

    // Must contain at least one category keyword or common spirit terms
    const commonSpiriterms = ['series', 'collection', 'edition', 'expression', 'range', 'blend', 'bottle'];
    const allKeywords = [...categoryKeywords, ...commonSpiriterms];
    
    return allKeywords.some(keyword => titleLower.includes(keyword)) || 
           /^\w+\s*(series|collection|edition|expression|range|blend)$/i.test(title);
  }
}