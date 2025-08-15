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
      result.address = this.extractAddress($);

      // Extract contact details
      result.contactDetails = this.extractContactDetails($);

      // Phase 1: Extract products from main page
      result.products = await this.extractProducts($, normalizedUrl);

      // Phase 2: Discover and crawl relevant sub-pages for more products
      if (result.products.length < this.MAX_PRODUCTS) {
        const subPages = this.discoverRelevantPages($, normalizedUrl);
        const additionalProducts = await this.crawlSubPages(subPages, normalizedUrl);
        
        // Merge products, avoiding duplicates
        const existingNames = new Set(result.products.map(p => p.name.toLowerCase()));
        additionalProducts.forEach(product => {
          if (!existingNames.has(product.name.toLowerCase()) && result.products.length < this.MAX_PRODUCTS) {
            result.products.push(product);
            existingNames.add(product.name.toLowerCase());
          }
        });
      }

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
    // Enhanced address extraction with drinks industry patterns
    const selectors = [
      // Standard address selectors
      'address', '.address', '.location', '.contact-address',
      '[data-testid*="address"]', '[data-address]',
      
      // Content-based selectors
      '*:contains("Address")', '*:contains("Location")', '*:contains("Visit us")',
      '*:contains("Find us")', '*:contains("Distillery")', '*:contains("Brewery")', 
      '*:contains("Winery")', '*:contains("Headquarters")', '*:contains("Estate")',
      
      // Contact sections
      '.contact-info', '.contact-details', '.footer-address', '.company-info',
      '#contact', '.contact-section', '.about-location'
    ];

    for (const selector of selectors) {
      const elements = $(selector);
      
      for (let i = 0; i < elements.length; i++) {
        const $elem = $(elements[i]);
        let text = $elem.text().trim();
        
        // Skip if it's just a label
        if (text.toLowerCase() === 'address' || text.toLowerCase() === 'location') {
          continue;
        }
        
        // Look for address patterns
        if (this.looksLikeAddress(text)) {
          return text.replace(/\s+/g, ' ');
        }
      }
    }

    // Fallback: search for address-like patterns in the entire page
    const bodyText = $('body').text();
    const addressPatterns = [
      // UK/EU address patterns
      /\b\d+\s+[A-Za-z\s,]+,\s*[A-Za-z\s]+,\s*[A-Z]{2,3}\s*\d+[A-Z]{0,2}\b/g,
      // US address patterns  
      /\b\d+\s+[A-Za-z\s,]+,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s+\d{5}(-\d{4})?\b/g,
      // General patterns with postal codes
      /\b[A-Za-z\s,]+,\s*[A-Za-z\s]+,\s*[A-Z0-9\s]{3,10}\b/g
    ];

    for (const pattern of addressPatterns) {
      const matches = bodyText.match(pattern);
      if (matches && matches.length > 0) {
        const address = matches[0].trim();
        if (address.length > 15 && address.length < 200) {
          return address.replace(/\s+/g, ' ');
        }
      }
    }

    return undefined;
  }

  private static looksLikeAddress(text: string): boolean {
    if (!text || text.length < 10 || text.length > 300) return false;
    
    const cleanText = text.toLowerCase();
    
    // Address indicators
    const addressIndicators = [
      'street', 'road', 'avenue', 'lane', 'drive', 'court', 'way', 'place',
      'distillery', 'brewery', 'winery', 'estate', 'farm', 'vineyard'
    ];
    
    // Postal code patterns
    const hasPostalCode = /\b[A-Z0-9]{3,10}\b/.test(text);
    const hasNumber = /\b\d+\b/.test(text);
    const hasCommas = text.includes(',');
    const hasAddressWords = addressIndicators.some(word => cleanText.includes(word));
    
    return (hasPostalCode && hasNumber) || (hasAddressWords && hasCommas);
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

    // Enhanced selectors specifically for drinks industry websites
    const productSelectors = [
      // Standard product selectors
      '.product', '.product-card', '.product-item', '.product-container',
      '[data-testid*="product"]', '.shop-item', '.item', '.collection-item',
      
      // Drinks-specific selectors
      '.drink', '.bottle', '.spirits', '.wine', '.beer', '.rum', '.gin', '.whisky', '.vodka',
      '.calvados', '.cognac', '.brandy', '.liqueur', '.cocktail', '.mixer', '.cider',
      
      // Content-based selectors
      'article', '.card', '.tile', '.grid-item',
      '[class*="product"]', '[id*="product"]', '[class*="bottle"]', '[class*="drink"]',
      
      // E-commerce platform selectors
      '.woocommerce-loop-product__title', '.product-title', '.item-title',
      '.shopify-product', '.magento-product', '.bigcommerce-product',
      
      // Generic content selectors that might contain products
      'section h2, section h3, section h4', // Product sections
      '.gallery .item', '.slider .item', // Image galleries/sliders
      'ul li', 'ol li' // Lists that might contain products
    ];

    for (const selector of productSelectors) {
      const elements = $(selector);
      elements.each((i, elem) => {
        if (products.length >= this.MAX_PRODUCTS) return false;

        const $elem = $(elem);
        
        // Enhanced product name extraction for drinks industry
        const nameSelectors = [
          // Primary selectors
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          '.product-name', '.product-title', '.bottle-name', '.drink-name',
          '.name', '.title', '.label', '.brand-name',
          
          // Drinks-specific selectors  
          '.wine-name', '.spirit-name', '.rum-name', '.gin-name', '.whisky-name',
          '.beer-name', '.cocktail-name', '.mixer-name', '.cider-name',
          
          // Data attributes and links
          '[data-product-name]', '[data-title]', '[data-name]',
          'a[title]', 'a[alt]', 'img[alt]', 'img[title]',
          
          // E-commerce specific
          '.woocommerce-loop-product__title', '.entry-title', '.post-title'
        ];
        let name = '';
        
        for (const nameSelector of nameSelectors) {
          const element = $elem.find(nameSelector).first();
          const nameText = element.text().trim() || 
                          element.attr('alt') || 
                          element.attr('title') || 
                          element.attr('data-name') || '';
          
          if (nameText && nameText.length > 2 && nameText.length < 150) {
            // Clean up the name
            name = nameText.replace(/\s+/g, ' ').trim();
            // Remove common prefixes/suffixes that aren't part of product name
            name = name.replace(/^(product|bottle|drink):\s*/i, '');
            name = name.replace(/\s*-\s*(buy now|shop|purchase|order).*$/i, '');
            break;
          }
        }

        // Fallback: try to extract from element text or nearby siblings
        if (!name) {
          // Check if this element contains mostly product-like text
          const elementText = $elem.text().trim();
          const lines = elementText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
          
          for (const line of lines) {
            if (line.length > 2 && line.length < 150 && this.looksLikeProductName(line)) {
              name = line;
              break;
            }
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

    // Phase 3: Advanced extraction for missed products using text analysis
    if (products.length < 5) {
      const textBasedProducts = this.extractProductsFromText($, baseUrl);
      textBasedProducts.forEach(product => {
        if (!foundNames.has(product.name.toLowerCase()) && products.length < this.MAX_PRODUCTS) {
          foundNames.add(product.name.toLowerCase());
          products.push(product);
        }
      });
    }

    return products;
  }

  private static extractProductsFromText($: cheerio.CheerioAPI, baseUrl: string): Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }> {
    const products: Array<{
      name: string;
      category?: string;
      imageUrl?: string;
      isPrimary: boolean;
    }> = [];
    const foundNames = new Set<string>();

    // Extract product names from structured text content
    const textSelectors = [
      'main p', 'article p', '.content p', '.description p',
      'main ul li', 'main ol li', '.product-list li', '.range li',
      'h1, h2, h3, h4', '.title, .heading', '.product-name, .bottle-name'
    ];

    textSelectors.forEach(selector => {
      $(selector).each((_, elem) => {
        if (products.length >= 10) return false;

        const $elem = $(elem);
        const text = $elem.text().trim();
        
        // Look for patterns that suggest product names
        const lines = text.split(/[,;.\n]/).map(line => line.trim());
        
        lines.forEach(line => {
          if (line.length > 3 && line.length < 100 && this.looksLikeProductName(line)) {
            const cleanName = line.replace(/^[-*•]\s*/, '').trim();
            if (!foundNames.has(cleanName.toLowerCase()) && products.length < 10) {
              foundNames.add(cleanName.toLowerCase());
              
              // Try to find related image
              const nearbyImg = $elem.closest('section, article, div').find('img').first();
              let imageUrl = nearbyImg.attr('src') || nearbyImg.attr('data-src');
              if (imageUrl && !imageUrl.startsWith('http')) {
                try {
                  imageUrl = new URL(imageUrl, baseUrl).href;
                } catch {
                  imageUrl = undefined;
                }
              }

              products.push({
                name: cleanName,
                category: this.guessProductCategory(cleanName, text),
                imageUrl,
                isPrimary: false
              });
            }
          }
        });
      });
    });

    return products;
  }

  private static guessProductCategory(name: string, context: string): string | undefined {
    const text = (name + ' ' + context).toLowerCase();
    
    // Enhanced category detection with more comprehensive keywords
    const categories = {
      'spirits': [
        // Spirits types
        'whiskey', 'whisky', 'bourbon', 'scotch', 'rye', 'irish whiskey',
        'vodka', 'gin', 'rum', 'tequila', 'brandy', 'cognac', 'armagnac', 
        'calvados', 'grappa', 'schnapps', 'absinthe', 'ouzo', 'sake',
        'mezcal', 'pisco', 'cachaça', 'soju', 'baijiu', 'arak',
        // Common spirit terms
        'proof', 'aged', 'distilled', 'single malt', 'blended', 'cask',
        'barrel aged', 'overproof', 'spiced', 'dark', 'white', 'gold',
        'reserve', 'premium', 'craft spirit', 'distillery'
      ],
      'wine': [
        'wine', 'vintage', 'pinot', 'chardonnay', 'cabernet', 'merlot', 
        'sauvignon', 'riesling', 'shiraz', 'syrah', 'sangiovese', 'tempranillo',
        'grenache', 'pinot grigio', 'moscato', 'prosecco', 'champagne',
        'red wine', 'white wine', 'rosé', 'sparkling', 'dessert wine',
        'winery', 'vineyard', 'estate', 'reserve wine', 'organic wine'
      ],
      'beer': [
        'beer', 'ale', 'lager', 'ipa', 'stout', 'pilsner', 'porter', 
        'wheat beer', 'hefeweizen', 'saison', 'lambic', 'sour beer',
        'pale ale', 'brown ale', 'amber', 'bitter', 'mild', 'session',
        'craft beer', 'brewery', 'brewed', 'hops', 'malt', 'draught'
      ],
      'cider': [
        'cider', 'apple wine', 'perry', 'fruit cider', 'scrumpy',
        'dry cider', 'sweet cider', 'sparkling cider', 'farmhouse cider',
        'traditional cider', 'craft cider', 'cidery', 'orchard'
      ],
      'liqueur': [
        'liqueur', 'cream liqueur', 'coffee liqueur', 'herbal liqueur',
        'fruit liqueur', 'nut liqueur', 'amaro', 'aperitif', 'digestif',
        'schnapps', 'sambuca', 'cointreau', 'grand marnier', 'kahlua',
        'bailey', 'amaretto', 'frangelico', 'limoncello', 'chartreuse'
      ],
      'mixer': [
        'mixer', 'tonic', 'soda', 'ginger beer', 'bitter', 'vermouth',
        'triple sec', 'simple syrup', 'grenadine', 'cocktail mixer',
        'bar syrup', 'bitters', 'garnish'
      ],
      'non-alcoholic': [
        'non-alcoholic', 'alcohol-free', 'zero percent', '0%', 'na beer',
        'mocktail', 'virgin', 'dealcoholized', 'low alcohol', 'alcohol removed'
      ]
    };

    // Check for category matches with weighted scoring
    let bestMatch = 'other';
    let highestScore = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => text.includes(keyword)).length;
      if (matches > highestScore) {
        highestScore = matches;
        bestMatch = category;
      }
    }

    return highestScore > 0 ? bestMatch : 'other';
  }

  private static looksLikeProductName(text: string): boolean {
    const cleanText = text.toLowerCase().trim();
    
    // Too short or too long
    if (cleanText.length < 3 || cleanText.length > 100) return false;
    
    // Contains common product indicators
    const productIndicators = [
      'rum', 'gin', 'whisky', 'whiskey', 'vodka', 'brandy', 'cognac', 'calvados',
      'wine', 'beer', 'ale', 'lager', 'ipa', 'stout', 'cider', 'liqueur',
      'vintage', 'aged', 'proof', 'abv', 'ml', 'cl', 'bottle', 'flask'
    ];
    
    // Avoid common non-product text
    const blacklist = [
      'click', 'buy', 'shop', 'cart', 'price', 'contact', 'about', 'home',
      'menu', 'login', 'register', 'search', 'filter', 'sort', 'page',
      'copyright', 'terms', 'privacy', 'policy', 'cookie'
    ];
    
    // Check for blacklisted terms
    if (blacklist.some(term => cleanText.includes(term))) return false;
    
    // Check for product indicators or typical product name patterns
    const hasProductIndicator = productIndicators.some(indicator => cleanText.includes(indicator));
    const hasNumberPattern = /\d+\s*(ml|cl|l|%|proof|year|aged)/i.test(text);
    const hasCapitalizedWords = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(text.trim());
    
    return hasProductIndicator || hasNumberPattern || hasCapitalizedWords;
  }

  private static discoverRelevantPages($: cheerio.CheerioAPI, baseUrl: string): string[] {
    const relevantLinks: string[] = [];
    const baseUrlObj = new URL(baseUrl);
    
    // Look for links that likely contain product information
    const relevantPatterns = [
      // Product/shop pages
      /product/i, /shop/i, /store/i, /catalog/i, /collection/i,
      // Drinks-specific pages
      /rum/i, /gin/i, /whisky/i, /whiskey/i, /vodka/i, /wine/i, /beer/i, /spirits/i, /drinks/i,
      /bottle/i, /distillery/i, /brewery/i, /winery/i, /range/i, /selection/i,
      // Portfolio/brand pages
      /portfolio/i, /brands/i, /our.*products/i, /what.*we.*make/i, /offerings/i,
      /menu/i, /list/i, /gallery/i
    ];

    $('a[href]').each((_, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const linkText = $link.text().toLowerCase().trim();
      
      if (!href || relevantLinks.length >= this.MAX_PAGES) return;
      
      try {
        const fullUrl = new URL(href, baseUrl).href;
        
        // Skip external links, fragments, and already added URLs
        if (!fullUrl.startsWith(baseUrlObj.origin) || 
            fullUrl.includes('#') || 
            relevantLinks.includes(fullUrl) ||
            fullUrl === baseUrl) return;
        
        // Check if the URL or link text suggests product content
        const urlPath = new URL(fullUrl).pathname.toLowerCase();
        const isRelevant = relevantPatterns.some(pattern => 
          pattern.test(urlPath) || pattern.test(linkText)
        );
        
        if (isRelevant) {
          relevantLinks.push(fullUrl);
        }
      } catch (error) {
        // Skip malformed URLs
      }
    });

    return relevantLinks;
  }

  private static async crawlSubPages(subPageUrls: string[], baseUrl: string): Promise<Array<{
    name: string;
    category?: string;
    imageUrl?: string;
    isPrimary: boolean;
  }>> {
    const allProducts: Array<{
      name: string;
      category?: string;
      imageUrl?: string;
      isPrimary: boolean;
    }> = [];
    
    for (const subUrl of subPageUrls) {
      try {
        // Rate limiting to be respectful
        await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY));
        
        const response = await fetch(subUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SustainabilityBot/1.0)',
          },
          signal: AbortSignal.timeout(this.TIMEOUT)
        });

        if (!response.ok) continue;
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        // Extract products from this sub-page
        const pageProducts = await this.extractProducts($, baseUrl);
        
        // Mark sub-page products as non-primary
        pageProducts.forEach(product => {
          product.isPrimary = false;
          allProducts.push(product);
        });
        
        // Stop if we have enough products
        if (allProducts.length >= this.MAX_PRODUCTS) break;
        
      } catch (error) {
        console.warn(`Failed to scrape sub-page ${subUrl}:`, error.message);
        continue;
      }
    }

    return allProducts;
  }
}