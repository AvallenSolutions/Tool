#!/usr/bin/env python3
"""
Simple Web Crawler for Bulk Supplier Import
Uses requests and BeautifulSoup for multi-page crawling without Scrapy's reactor issues
"""

import requests
import json
import re
import sys
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import time
from typing import Dict, List, Any, Optional

class SimpleWebCrawler:
    def __init__(self, start_url: str):
        self.start_url = start_url
        self.base_domain = urlparse(start_url).netloc
        self.company_data = {}
        self.products_data = []
        self.visited_urls = set()
        self.session = requests.Session()
        
        # Set a user agent to avoid being blocked
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
    
    def crawl_supplier_catalog(self) -> Dict[str, Any]:
        """Main crawling method"""
        try:
            # Step 1: Extract company profile from main page
            main_response = self.session.get(self.start_url, timeout=30)
            main_response.raise_for_status()
            
            main_soup = BeautifulSoup(main_response.text, 'html.parser')
            self.extract_company_profile(main_soup, self.start_url)
            
            # Step 2: Look for company info links (About Us, Contact)
            company_links = self.find_company_info_links(main_soup)
            for link in company_links[:3]:  # Limit to 3 company pages
                self.crawl_company_page(link)
            
            # Step 3: Find product links
            product_links = self.find_product_links(main_soup)
            
            # Step 4: Crawl each product page (limit to 20 for performance)
            for link in product_links[:20]:
                if link not in self.visited_urls:
                    self.crawl_product_page(link)
                    time.sleep(0.5)  # Be respectful to the server
            
            return {
                'success': True,
                'supplierData': self.company_data,
                'productsData': self.products_data,
                'totalProducts': len(self.products_data)
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': f"Crawling failed: {str(e)}"
            }
    
    def extract_company_profile(self, soup: BeautifulSoup, url: str):
        """Extract company information from the main page"""
        # Extract company name
        company_name = self.extract_company_name(soup, url)
        
        # Extract contact information
        email = self.extract_email(soup)
        address = self.extract_address(soup)
        phone = self.extract_phone(soup)
        
        self.company_data.update({
            'companyName': company_name,
            'website': url,
            'email': email,
            'address': address,
            'phone': phone,
            'supplierType': 'Packaging',  # Default, can be refined
            'description': self.extract_description(soup)
        })
    
    def find_company_info_links(self, soup: BeautifulSoup) -> List[str]:
        """Find links to company information pages"""
        company_links = []
        
        # Look for about/contact links
        selectors = [
            'a[href*="about"]',
            'a[href*="contact"]', 
            'a[href*="company"]',
            'a:contains("About")',
            'a:contains("Contact")',
            'a:contains("Company")'
        ]
        
        for selector in selectors:
            try:
                links = soup.select(selector)
                for link in links:
                    href = link.get('href')
                    if href:
                        full_url = urljoin(self.start_url, href)
                        if self.is_same_domain(full_url):
                            company_links.append(full_url)
            except:
                continue
        
        return list(set(company_links))  # Remove duplicates
    
    def find_product_links(self, soup: BeautifulSoup) -> List[str]:
        """Identify links that lead to individual product pages"""
        product_links = []
        
        # Common patterns for product links
        selectors = [
            'a[href*="product"]',
            'a[href*="bottle"]',
            'a[href*="container"]',
            'a[href*="packaging"]',
            '.product-item a',
            '.product-card a',
            '.product-grid a',
            '.catalog-item a',
            '.product a'
        ]
        
        for selector in selectors:
            try:
                links = soup.select(selector)
                for link in links:
                    href = link.get('href')
                    if href and self.is_product_link(href):
                        full_url = urljoin(self.start_url, href)
                        if self.is_same_domain(full_url):
                            product_links.append(full_url)
            except:
                continue
        
        return list(set(product_links))  # Remove duplicates
    
    def is_product_link(self, href: str) -> bool:
        """Determine if a link is likely a product page"""
        if not href:
            return False
            
        # Skip certain types of links
        skip_patterns = ['mailto:', 'tel:', '#', 'javascript:', '.pdf', '.jpg', '.png', '.css', '.js']
        if any(pattern in href.lower() for pattern in skip_patterns):
            return False
            
        # Look for product indicators
        product_indicators = ['product', 'bottle', 'container', 'jar', 'cap', 'closure', 'packaging']
        return any(indicator in href.lower() for indicator in product_indicators)
    
    def is_same_domain(self, url: str) -> bool:
        """Check if URL is from the same domain"""
        try:
            domain = urlparse(url).netloc
            return domain == self.base_domain or domain.endswith('.' + self.base_domain)
        except:
            return False
    
    def crawl_company_page(self, url: str):
        """Parse dedicated company/about/contact pages"""
        try:
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
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
                
        except Exception as e:
            print(f"Error crawling company page {url}: {e}", file=sys.stderr)
    
    def crawl_product_page(self, url: str):
        """Parse individual product pages"""
        try:
            self.visited_urls.add(url)
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')
            
            product_data = self.extract_product_data(soup, url)
            if product_data and product_data.get('productName'):
                self.products_data.append(product_data)
                
        except Exception as e:
            print(f"Error crawling product page {url}: {e}", file=sys.stderr)
    
    def extract_product_data(self, soup: BeautifulSoup, url: str) -> Optional[Dict[str, Any]]:
        """Extract detailed product information from a product page"""
        
        # Extract product name
        name_selectors = ['h1', '.product-title', '.product-name', '[data-product-name]', '.title']
        product_name = self.extract_by_selectors(soup, name_selectors)
        
        if not product_name:
            return None
        
        # Extract description
        desc_selectors = ['.product-description', '.description', '.product-details p', '.content p']
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
    
    def extract_specifications(self, soup: BeautifulSoup) -> Dict[str, Any]:
        """Extract product specifications from various page formats"""
        specs = {}
        
        # Look for specification tables
        tables = soup.find_all('table')
        for table in tables:
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
        
        # Look for text patterns
        text = soup.get_text()
        self.extract_specs_from_text(text, specs)
        
        return specs
    
    def parse_spec_value(self, key: str, value: str, specs: Dict[str, Any]):
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
    
    def extract_specs_from_text(self, text: str, specs: Dict[str, Any]):
        """Extract specifications from free text using patterns"""
        # Weight patterns
        weight_match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)', text, re.IGNORECASE)
        if weight_match and 'weight' not in specs:
            specs['weight'] = float(weight_match.group(1))
            specs['weight_unit'] = weight_match.group(2).lower()
        
        # Capacity patterns
        capacity_match = re.search(r'(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)', text, re.IGNORECASE)
        if capacity_match and 'capacity' not in specs:
            specs['capacity'] = float(capacity_match.group(1))
            specs['capacity_unit'] = capacity_match.group(2).lower()
    
    def parse_weight(self, value: str, specs: Dict[str, Any]):
        """Parse weight value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)?', value, re.IGNORECASE)
        if match:
            specs['weight'] = float(match.group(1))
            specs['weight_unit'] = match.group(2).lower() if match.group(2) else 'g'
    
    def parse_capacity(self, value: str, specs: Dict[str, Any]):
        """Parse capacity value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)?', value, re.IGNORECASE)
        if match:
            specs['capacity'] = float(match.group(1))
            specs['capacity_unit'] = match.group(2).lower() if match.group(2) else 'ml'
    
    def extract_percentage(self, text: str) -> Optional[int]:
        """Extract percentage value"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*%', text)
        return float(match.group(1)) if match else None
    
    def extract_by_selectors(self, soup: BeautifulSoup, selectors: List[str]) -> Optional[str]:
        """Extract text using multiple CSS selectors"""
        for selector in selectors:
            try:
                element = soup.select_one(selector)
                if element:
                    text = element.get_text(strip=True)
                    if text and len(text) > 2:
                        return text
            except:
                continue
        return None
    
    def extract_company_name(self, soup: BeautifulSoup, url: str) -> str:
        """Extract company name from page"""
        # Try logo alt text
        logo = soup.find('img', {'alt': re.compile(r'logo', re.IGNORECASE)})
        if logo and logo.get('alt'):
            name = logo['alt'].replace('logo', '').replace('Logo', '').strip()
            if name:
                return name
        
        # Try title tag
        title = soup.find('title')
        if title:
            title_text = title.get_text().strip()
            # Remove common suffixes
            for suffix in [' - Home', ' | Home', ' - Official Site', ' | Official Site']:
                title_text = title_text.replace(suffix, '')
            if title_text:
                return title_text
        
        # Fallback to domain name
        domain = urlparse(url).netloc
        return domain.replace('www.', '').replace('.com', '').replace('.co.uk', '').title()
    
    def extract_email(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract email address"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        text = soup.get_text()
        match = re.search(email_pattern, text)
        return match.group(0) if match else None
    
    def extract_address(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract physical address"""
        # Look for address patterns
        text = soup.get_text()
        # Look for postal codes and addresses
        patterns = [
            r'[A-Za-z0-9\s,.-]+\b\d{5}(?:-\d{4})?\b',  # US ZIP
            r'[A-Za-z0-9\s,.-]+\b[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}\b',  # UK postcode
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                address = match.group(0).strip()
                if len(address) > 20:  # Ensure it's substantial
                    return address
        return None
    
    def extract_phone(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract phone number"""
        phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
        text = soup.get_text()
        match = re.search(phone_pattern, text)
        return match.group(0) if match else None
    
    def extract_description(self, soup: BeautifulSoup) -> Optional[str]:
        """Extract company description"""
        # Look for meta description first
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            return meta_desc['content'].strip()
        
        # Look for about sections
        about_selectors = ['.about-text', '.company-description', '.intro-text', '.hero-text']
        for selector in about_selectors:
            element = soup.select_one(selector)
            if element:
                text = element.get_text(strip=True)
                if len(text) > 50:
                    return text
        
        # Fallback: first substantial paragraph
        paragraphs = soup.find_all('p')
        for p in paragraphs:
            text = p.get_text(strip=True)
            if len(text) > 100:
                return text
        
        return None
    
    def extract_product_images(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """Extract product images"""
        images = []
        
        # Look for product images
        img_selectors = [
            '.product-image img', '.product-gallery img', 
            '.product-photos img', '[data-product-image]',
            '.product img', '.gallery img'
        ]
        
        for selector in img_selectors:
            try:
                img_elements = soup.select(selector)
                for img in img_elements:
                    src = img.get('src') or img.get('data-src')
                    if src:
                        full_url = urljoin(base_url, src)
                        if self.is_valid_image_url(full_url):
                            images.append(full_url)
            except:
                continue
        
        return list(set(images))[:5]  # Remove duplicates, limit to 5
    
    def is_valid_image_url(self, url: str) -> bool:
        """Check if URL is a valid image"""
        image_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
        return any(url.lower().endswith(ext) for ext in image_extensions)

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'URL argument required'}))
        sys.exit(1)
    
    start_url = sys.argv[1]
    crawler = SimpleWebCrawler(start_url)
    result = crawler.crawl_supplier_catalog()
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()