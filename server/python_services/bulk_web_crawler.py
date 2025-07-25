#!/usr/bin/env python3
"""
Bulk Web Crawler for Supplier Data Import
Uses Scrapy for multi-page crawling and BeautifulSoup for detailed extraction
"""

import scrapy
import json
import re
import sys
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
from scrapy.crawler import CrawlerRunner
from twisted.internet import reactor, defer
from scrapy.utils.log import configure_logging
import logging

# Configure logging to reduce noise
configure_logging({'LOG_LEVEL': 'WARNING'})
logging.getLogger('scrapy').setLevel(logging.WARNING)

class SupplierCrawlerSpider(scrapy.Spider):
    name = 'supplier_crawler'
    
    def __init__(self, start_url=None, *args, **kwargs):
        super(SupplierCrawlerSpider, self).__init__(*args, **kwargs)
        self.start_urls = [start_url] if start_url else []
        self.base_domain = urlparse(start_url).netloc if start_url else ''
        self.company_data = {}
        self.products_data = []
        self.visited_product_urls = set()
        
    def parse(self, response):
        """Parse the main catalog page"""
        # Step 1: Extract company profile from main page
        self.extract_company_profile(response)
        
        # Step 2: Look for company info links (About Us, Contact)
        company_links = response.css('a[href*="about"], a[href*="contact"], a[href*="company"]::attr(href)').getall()
        for link in company_links[:3]:  # Limit to 3 company pages
            full_url = urljoin(response.url, link)
            yield response.follow(full_url, self.parse_company_page)
        
        # Step 3: Find product links
        product_links = self.find_product_links(response)
        
        # Step 4: Crawl each product page
        for link in product_links[:50]:  # Limit to 50 products for performance
            if link not in self.visited_product_urls:
                self.visited_product_urls.add(link)
                full_url = urljoin(response.url, link)
                yield response.follow(full_url, self.parse_product_page)
    
    def extract_company_profile(self, response):
        """Extract company information from the main page"""
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract company name
        company_name = self.extract_company_name(soup, response.url)
        
        # Extract contact information
        email = self.extract_email(soup)
        address = self.extract_address(soup)
        phone = self.extract_phone(soup)
        
        self.company_data.update({
            'companyName': company_name,
            'website': response.url,
            'email': email,
            'address': address,
            'phone': phone,
            'supplierType': 'Packaging', # Default, can be refined
            'description': self.extract_description(soup)
        })
    
    def parse_company_page(self, response):
        """Parse dedicated company/about/contact pages"""
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Update company data with more detailed info
        if not self.company_data.get('email'):
            self.company_data['email'] = self.extract_email(soup)
        
        if not self.company_data.get('address'):
            self.company_data['address'] = self.extract_address(soup)
            
        if not self.company_data.get('phone'):
            self.company_data['phone'] = self.extract_phone(soup)
            
        # Extract more detailed description
        description = self.extract_description(soup)
        if description and len(description) > len(self.company_data.get('description', '')):
            self.company_data['description'] = description
    
    def find_product_links(self, response):
        """Identify links that lead to individual product pages"""
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Common patterns for product links
        product_selectors = [
            'a[href*="product"]',
            'a[href*="bottle"]',
            'a[href*="container"]',
            'a[href*="packaging"]',
            '.product-item a',
            '.product-card a',
            '.product-grid a',
            '.catalog-item a'
        ]
        
        product_links = []
        for selector in product_selectors:
            links = soup.select(selector)
            for link in links:
                href = link.get('href')
                if href and self.is_product_link(href):
                    product_links.append(href)
        
        # Remove duplicates
        return list(set(product_links))
    
    def is_product_link(self, href):
        """Determine if a link is likely a product page"""
        if not href:
            return False
            
        # Skip certain types of links
        skip_patterns = ['mailto:', 'tel:', '#', 'javascript:', '.pdf', '.jpg', '.png']
        if any(pattern in href.lower() for pattern in skip_patterns):
            return False
            
        # Look for product indicators
        product_indicators = ['product', 'bottle', 'container', 'jar', 'cap', 'closure']
        return any(indicator in href.lower() for indicator in product_indicators)
    
    def parse_product_page(self, response):
        """Parse individual product pages"""
        soup = BeautifulSoup(response.text, 'html.parser')
        
        product_data = self.extract_product_data(soup, response.url)
        if product_data and product_data.get('productName'):
            self.products_data.append(product_data)
    
    def extract_product_data(self, soup, url):
        """Extract detailed product information from a product page"""
        
        # Extract product name
        name_selectors = ['h1', '.product-title', '.product-name', '[data-product-name]']
        product_name = self.extract_by_selectors(soup, name_selectors)
        
        # Extract description
        desc_selectors = ['.product-description', '.description', '.product-details p']
        description = self.extract_by_selectors(soup, desc_selectors)
        
        # Extract specifications
        specs = self.extract_specifications(soup)
        
        # Extract images
        images = self.extract_product_images(soup, url)
        
        return {
            'productName': product_name,
            'description': description,
            'materialType': specs.get('material'),
            'weight': specs.get('weight'),
            'weightUnit': specs.get('weight_unit'),
            'capacity': specs.get('capacity'),
            'capacityUnit': specs.get('capacity_unit'),
            'color': specs.get('color'),
            'dimensions': specs.get('dimensions'),
            'recycledContent': specs.get('recycled_content'),
            'sku': specs.get('sku'),
            'productImage': images[0] if images else None,
            'additionalImages': images[1:5] if len(images) > 1 else [],
            'sourceUrl': url
        }
    
    def extract_specifications(self, soup):
        """Extract product specifications from various page formats"""
        specs = {}
        
        # Look for specification tables
        spec_tables = soup.find_all('table')
        for table in spec_tables:
            rows = table.find_all('tr')
            for row in rows:
                cells = row.find_all(['td', 'th'])
                if len(cells) >= 2:
                    key = cells[0].get_text(strip=True).lower()
                    value = cells[1].get_text(strip=True)
                    self.parse_spec_value(key, value, specs)
        
        # Look for definition lists
        dl_elements = soup.find_all('dl')
        for dl in dl_elements:
            terms = dl.find_all('dt')
            values = dl.find_all('dd')
            for term, value in zip(terms, values):
                key = term.get_text(strip=True).lower()
                val = value.get_text(strip=True)
                self.parse_spec_value(key, val, specs)
        
        # Look for labeled spans/divs
        text = soup.get_text()
        self.extract_specs_from_text(text, specs)
        
        return specs
    
    def parse_spec_value(self, key, value, specs):
        """Parse a specification key-value pair"""
        if 'material' in key:
            specs['material'] = value
        elif 'weight' in key:
            self.parse_weight(value, specs)
        elif 'capacity' in key or 'volume' in key:
            self.parse_capacity(value, specs)
        elif 'color' in key or 'colour' in key:
            specs['color'] = value
        elif 'sku' in key or 'code' in key:
            specs['sku'] = value
        elif 'recycle' in key:
            specs['recycled_content'] = self.extract_percentage(value)
        elif any(dim in key for dim in ['height', 'width', 'diameter', 'dimension']):
            if 'dimensions' not in specs:
                specs['dimensions'] = {}
            if 'height' in key:
                specs['dimensions']['height'] = self.extract_number(value)
            elif 'width' in key:
                specs['dimensions']['width'] = self.extract_number(value)
            elif 'diameter' in key:
                specs['dimensions']['diameter'] = self.extract_number(value)
    
    def extract_specs_from_text(self, text, specs):
        """Extract specifications from free text using patterns"""
        # Weight patterns
        weight_match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)', text, re.IGNORECASE)
        if weight_match:
            specs['weight'] = float(weight_match.group(1))
            specs['weight_unit'] = weight_match.group(2).lower()
        
        # Capacity patterns
        capacity_match = re.search(r'(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)', text, re.IGNORECASE)
        if capacity_match:
            specs['capacity'] = float(capacity_match.group(1))
            specs['capacity_unit'] = capacity_match.group(2).lower()
    
    def parse_weight(self, value, specs):
        """Parse weight value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)?', value, re.IGNORECASE)
        if match:
            specs['weight'] = float(match.group(1))
            specs['weight_unit'] = match.group(2).lower() if match.group(2) else 'g'
    
    def parse_capacity(self, value, specs):
        """Parse capacity value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)?', value, re.IGNORECASE)
        if match:
            specs['capacity'] = float(match.group(1))
            specs['capacity_unit'] = match.group(2).lower() if match.group(2) else 'ml'
    
    def extract_number(self, text):
        """Extract first number from text"""
        match = re.search(r'(\d+(?:\.\d+)?)', text)
        return float(match.group(1)) if match else None
    
    def extract_percentage(self, text):
        """Extract percentage value"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
        return float(match.group(1)) if match else None
    
    def extract_by_selectors(self, soup, selectors):
        """Extract text using multiple CSS selectors"""
        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if text:
                    return text
        return None
    
    def extract_company_name(self, soup, url):
        """Extract company name from page"""
        # Try logo alt text
        logo = soup.find('img', {'alt': re.compile(r'logo', re.IGNORECASE)})
        if logo and logo.get('alt'):
            return logo['alt'].replace('logo', '').replace('Logo', '').strip()
        
        # Try title tag
        title = soup.find('title')
        if title:
            title_text = title.get_text()
            # Remove common suffixes
            for suffix in [' - Home', ' | Home', ' - Official Site']:
                title_text = title_text.replace(suffix, '')
            return title_text.strip()
        
        # Fallback to domain name
        domain = urlparse(url).netloc
        return domain.replace('www.', '').replace('.com', '').replace('.co.uk', '').title()
    
    def extract_email(self, soup):
        """Extract email address"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        text = soup.get_text()
        match = re.search(email_pattern, text)
        return match.group(0) if match else None
    
    def extract_address(self, soup):
        """Extract physical address"""
        # Look for address patterns
        address_indicators = ['address', 'location', 'contact']
        for indicator in address_indicators:
            elements = soup.find_all(text=re.compile(indicator, re.IGNORECASE))
            for element in elements:
                parent = element.parent
                if parent:
                    text = parent.get_text(strip=True)
                    # Look for address-like patterns (with postal codes, cities)
                    if re.search(r'\b\d{5}(?:-\d{4})?\b|\b[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}\b', text):
                        return text
        return None
    
    def extract_phone(self, soup):
        """Extract phone number"""
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        text = soup.get_text()
        match = re.search(phone_pattern, text)
        return match.group(0) if match else None
    
    def extract_description(self, soup):
        """Extract company description"""
        desc_selectors = [
            '.about-text', '.company-description', '.intro-text',
            'meta[name="description"]', '.hero-text'
        ]
        
        for selector in desc_selectors:
            if selector.startswith('meta'):
                element = soup.select_one(selector)
                if element:
                    return element.get('content', '')
            else:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if len(text) > 50:  # Ensure it's substantial
                        return text
        
        # Fallback: first paragraph with substantial text
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 100:
                return text
        
        return None
    
    def extract_product_images(self, soup, base_url):
        """Extract product images"""
        images = []
        
        # Look for product images
        img_selectors = [
            '.product-image img', '.product-gallery img', 
            '.product-photos img', '[data-product-image]'
        ]
        
        for selector in img_selectors:
            img_elements = soup.select(selector)
            for img in img_elements:
                src = img.get('src') or img.get('data-src')
                if src:
                    full_url = urljoin(base_url, src)
                    if self.is_valid_image_url(full_url):
                        images.append(full_url)
        
        return list(set(images))  # Remove duplicates
    
    def is_valid_image_url(self, url):
        """Check if URL is a valid image"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        return any(url.lower().endswith(ext) for ext in image_extensions)

@defer.inlineCallbacks
def run_crawler(start_url):
    """Run the crawler and return results"""
    try:
        runner = CrawlerRunner()
        crawler = runner.create_crawler(SupplierCrawlerSpider)
        yield runner.crawl(crawler, start_url=start_url)
        
        # Get the spider instance to access collected data
        spider = crawler.spider
        
        result = {
            'success': True,
            'supplierData': spider.company_data,
            'productsData': spider.products_data,
            'totalProducts': len(spider.products_data)
        }
        
        print(json.dumps(result, indent=2))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))
    
    finally:
        reactor.stop()

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'URL argument required'}))
        sys.exit(1)
    
    start_url = sys.argv[1]
    
    # Configure reactor
    configure_logging({'LOG_LEVEL': 'WARNING'})
    
    # Run crawler
    run_crawler(start_url)
    reactor.run()