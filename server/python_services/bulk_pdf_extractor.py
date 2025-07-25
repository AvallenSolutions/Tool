#!/usr/bin/env python3
"""
Bulk PDF Extractor for Supplier Data Import
Uses pdfplumber for PDF parsing and pattern matching for data extraction
"""

import pdfplumber
import json
import re
import sys
from typing import Dict, List, Any, Optional

class BulkPDFExtractor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.company_data = {}
        self.products_data = []
        
    def extract_all_data(self) -> Dict[str, Any]:
        """Main extraction method"""
        try:
            with pdfplumber.open(self.pdf_path) as pdf:
                # Step 1: Extract company profile from first/last pages
                self.extract_company_profile(pdf)
                
                # Step 2: Extract product listings from all pages
                self.extract_product_listings(pdf)
                
                return {
                    'success': True,
                    'supplierData': self.company_data,
                    'productsData': self.products_data,
                    'totalProducts': len(self.products_data)
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': f"PDF extraction failed: {str(e)}"
            }
    
    def extract_company_profile(self, pdf):
        """Extract company information from first and last few pages"""
        pages_to_check = []
        
        # Check first 3 pages
        for i in range(min(3, len(pdf.pages))):
            pages_to_check.append(pdf.pages[i])
        
        # Check last 2 pages if document is longer
        if len(pdf.pages) > 3:
            for i in range(max(0, len(pdf.pages) - 2), len(pdf.pages)):
                if pdf.pages[i] not in pages_to_check:
                    pages_to_check.append(pdf.pages[i])
        
        company_text = ""
        for page in pages_to_check:
            company_text += page.extract_text() or ""
        
        # Extract company information
        self.company_data = {
            'companyName': self.extract_company_name(company_text),
            'address': self.extract_address(company_text),
            'email': self.extract_email(company_text),
            'phone': self.extract_phone(company_text),
            'website': self.extract_website(company_text),
            'supplierType': 'Packaging',  # Default
            'description': self.extract_company_description(company_text)
        }
    
    def extract_product_listings(self, pdf):
        """Extract product listings from all pages"""
        all_text = ""
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            all_text += page_text + "\n"
            
            # Try to extract tables from each page
            tables = page.extract_tables()
            for table in tables:
                self.process_product_table(table)
        
        # Extract products from text patterns
        self.extract_products_from_text(all_text)
        
        # Remove duplicates based on product name
        seen_names = set()
        unique_products = []
        for product in self.products_data:
            name = product.get('productName', '').lower()
            if name and name not in seen_names:
                seen_names.add(name)
                unique_products.append(product)
        
        self.products_data = unique_products
    
    def process_product_table(self, table: List[List[str]]):
        """Process a table that might contain product data"""
        if not table or len(table) < 2:
            return
        
        # Identify header row
        headers = []
        data_rows = []
        
        for row in table:
            if row and any(cell for cell in row if cell):  # Non-empty row
                if not headers:
                    headers = [cell.lower() if cell else '' for cell in row]
                else:
                    data_rows.append(row)
        
        # Process each data row as a potential product
        for row in data_rows:
            product = self.extract_product_from_table_row(headers, row)
            if product and product.get('productName'):
                self.products_data.append(product)
    
    def extract_product_from_table_row(self, headers: List[str], row: List[str]) -> Optional[Dict[str, Any]]:
        """Extract product data from a table row"""
        if not row or not headers:
            return None
        
        product = {}
        
        for i, cell in enumerate(row):
            if i < len(headers) and cell:
                header = headers[i].lower()
                
                if any(keyword in header for keyword in ['name', 'product', 'item', 'title']):
                    product['productName'] = cell.strip()
                elif any(keyword in header for keyword in ['description', 'desc', 'details']):
                    product['description'] = cell.strip()
                elif 'material' in header:
                    product['materialType'] = cell.strip()
                elif any(keyword in header for keyword in ['weight', 'mass']):
                    weight_data = self.parse_weight(cell)
                    product.update(weight_data)
                elif any(keyword in header for keyword in ['capacity', 'volume', 'size']):
                    capacity_data = self.parse_capacity(cell)
                    product.update(capacity_data)
                elif any(keyword in header for keyword in ['color', 'colour']):
                    product['color'] = cell.strip()
                elif any(keyword in header for keyword in ['sku', 'code', 'ref']):
                    product['sku'] = cell.strip()
                elif any(keyword in header for keyword in ['recycle', 'recycled']):
                    recycled = self.extract_percentage(cell)
                    if recycled:
                        product['recycledContent'] = recycled
        
        return product if product.get('productName') else None
    
    def extract_products_from_text(self, text: str):
        """Extract products from text using pattern matching"""
        # Split text into sections that might represent different products
        sections = self.split_into_product_sections(text)
        
        for section in sections:
            product = self.extract_product_from_text_section(section)
            if product and product.get('productName'):
                # Check for duplicates
                existing_names = {p.get('productName', '').lower() for p in self.products_data}
                if product['productName'].lower() not in existing_names:
                    self.products_data.append(product)
    
    def split_into_product_sections(self, text: str) -> List[str]:
        """Split text into sections that likely represent different products"""
        # Common product section delimiters
        delimiters = [
            r'\n\s*[A-Z][A-Z\s]+\n',  # All caps headings
            r'\n\s*\d+\.\s+',  # Numbered lists
            r'\n\s*[•·▪▫]\s+',  # Bullet points
            r'\n\s*Product\s+\d+',  # Product numbering
            r'\n\s*Item\s+\d+',  # Item numbering
        ]
        
        sections = [text]
        for delimiter in delimiters:
            new_sections = []
            for section in sections:
                parts = re.split(delimiter, section, flags=re.IGNORECASE | re.MULTILINE)
                new_sections.extend(parts)
            sections = new_sections
        
        # Filter out very short sections
        return [s.strip() for s in sections if len(s.strip()) > 50]
    
    def extract_product_from_text_section(self, text: str) -> Optional[Dict[str, Any]]:
        """Extract product data from a text section"""
        product = {}
        
        # Extract product name (usually first substantial line)
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if lines:
            # Look for a line that seems like a product name
            for line in lines[:3]:  # Check first 3 lines
                if self.is_likely_product_name(line):
                    product['productName'] = line
                    break
        
        # Extract specifications using patterns
        specs = self.extract_specs_from_text(text)
        product.update(specs)
        
        # Extract description (substantial paragraph)
        description = self.extract_description_from_text(text)
        if description:
            product['description'] = description
        
        return product if product.get('productName') else None
    
    def is_likely_product_name(self, line: str) -> bool:
        """Determine if a line is likely a product name"""
        # Skip lines that are too short or look like headers
        if len(line) < 3 or len(line) > 100:
            return False
        
        # Skip lines with common non-product indicators
        skip_patterns = [
            r'page\s+\d+', r'catalog', r'specifications?', r'description',
            r'features?', r'benefits?', r'contact', r'phone', r'email',
            r'address', r'www\.', r'http', r'\.com'
        ]
        
        if any(re.search(pattern, line, re.IGNORECASE) for pattern in skip_patterns):
            return False
        
        # Prefer lines with product-like indicators
        product_indicators = [
            r'bottle', r'jar', r'container', r'cap', r'closure', r'tube',
            r'pump', r'dispenser', r'packaging', r'ml', r'oz', r'gram'
        ]
        
        return any(re.search(indicator, line, re.IGNORECASE) for indicator in product_indicators)
    
    def extract_specs_from_text(self, text: str) -> Dict[str, Any]:
        """Extract specifications from text using regex patterns"""
        specs = {}
        
        # Material patterns
        material_match = re.search(r'material:?\s*([^,\n]+)', text, re.IGNORECASE)
        if material_match:
            specs['materialType'] = material_match.group(1).strip()
        
        # Weight patterns
        weight_match = re.search(r'weight:?\s*(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)', text, re.IGNORECASE)
        if weight_match:
            specs['weight'] = float(weight_match.group(1))
            specs['weightUnit'] = weight_match.group(2).lower()
        
        # Capacity patterns
        capacity_match = re.search(r'(?:capacity|volume|size):?\s*(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)', text, re.IGNORECASE)
        if capacity_match:
            specs['capacity'] = float(capacity_match.group(1))
            specs['capacityUnit'] = capacity_match.group(2).lower()
        
        # Color patterns
        color_match = re.search(r'colou?r:?\s*([^,\n]+)', text, re.IGNORECASE)
        if color_match:
            specs['color'] = color_match.group(1).strip()
        
        # SKU patterns
        sku_match = re.search(r'(?:sku|code|ref|item):?\s*([A-Z0-9-]+)', text, re.IGNORECASE)
        if sku_match:
            specs['sku'] = sku_match.group(1).strip()
        
        # Recycled content patterns
        recycled_match = re.search(r'recycled?\s*content:?\s*(\d+)\s*%', text, re.IGNORECASE)
        if recycled_match:
            specs['recycledContent'] = int(recycled_match.group(1))
        
        return specs
    
    def extract_description_from_text(self, text: str) -> Optional[str]:
        """Extract product description from text"""
        # Look for paragraphs that seem descriptive
        paragraphs = re.split(r'\n\s*\n', text)
        
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            # Skip short paragraphs or those with mostly technical specs
            if len(paragraph) < 50:
                continue
            
            # Skip paragraphs that are mostly specifications
            spec_indicators = ['weight:', 'material:', 'capacity:', 'size:', 'sku:']
            if sum(1 for indicator in spec_indicators if indicator in paragraph.lower()) > 2:
                continue
            
            # This looks like a description
            return paragraph
        
        return None
    
    def extract_company_name(self, text: str) -> str:
        """Extract company name from text"""
        # Look for company name patterns
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        
        # Check first few lines for company name
        for line in lines[:10]:
            # Skip very short or very long lines
            if len(line) < 3 or len(line) > 80:
                continue
            
            # Look for company indicators
            if any(indicator in line.lower() for indicator in ['ltd', 'inc', 'corp', 'company', 'limited']):
                return line
            
            # Look for all-caps company names
            if line.isupper() and len(line) > 5:
                return line.title()
        
        # Fallback: use first substantial line
        for line in lines[:5]:
            if len(line) > 5 and len(line) < 50:
                return line
        
        return "Unknown Company"
    
    def extract_address(self, text: str) -> Optional[str]:
        """Extract physical address"""
        # Look for address patterns with postal codes
        address_patterns = [
            r'[A-Za-z0-9\s,.-]+\b\d{5}(?:-\d{4})?\b',  # US ZIP
            r'[A-Za-z0-9\s,.-]+\b[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}\b',  # UK postcode
            r'[A-Za-z0-9\s,.-]+\b\d{4,5}\s[A-Za-z]+\b'  # Other postal codes
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text)
            if match:
                address = match.group(0).strip()
                if len(address) > 20:  # Ensure it's substantial
                    return address
        
        return None
    
    def extract_email(self, text: str) -> Optional[str]:
        """Extract email address"""
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        match = re.search(email_pattern, text)
        return match.group(0) if match else None
    
    def extract_phone(self, text: str) -> Optional[str]:
        """Extract phone number"""
        phone_patterns = [
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',
            r'\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b'
        ]
        
        for pattern in phone_patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        
        return None
    
    def extract_website(self, text: str) -> Optional[str]:
        """Extract website URL"""
        website_patterns = [
            r'https?://[^\s]+',
            r'www\.[^\s]+',
            r'\b[a-zA-Z0-9-]+\.(?:com|co\.uk|net|org|biz)\b'
        ]
        
        for pattern in website_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                url = match.group(0)
                if not url.startswith('http'):
                    url = 'https://' + url
                return url
        
        return None
    
    def extract_company_description(self, text: str) -> Optional[str]:
        """Extract company description"""
        # Look for about/company sections
        about_patterns = [
            r'about\s+us[:\s]*([^.]*\.)',
            r'company\s+overview[:\s]*([^.]*\.)',
            r'who\s+we\s+are[:\s]*([^.]*\.)'
        ]
        
        for pattern in about_patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                desc = match.group(1).strip()
                if len(desc) > 50:
                    return desc
        
        # Fallback: look for substantial paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        for paragraph in paragraphs:
            paragraph = paragraph.strip()
            if len(paragraph) > 100 and len(paragraph) < 500:
                # Check if it's not mostly contact info or specs
                if not re.search(r'phone|email|address|weight|material', paragraph, re.IGNORECASE):
                    return paragraph
        
        return None
    
    def parse_weight(self, value: str) -> Dict[str, Any]:
        """Parse weight value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(g|kg|gram|kilogram)?', value, re.IGNORECASE)
        if match:
            return {
                'weight': float(match.group(1)),
                'weightUnit': match.group(2).lower() if match.group(2) else 'g'
            }
        return {}
    
    def parse_capacity(self, value: str) -> Dict[str, Any]:
        """Parse capacity value and unit"""
        match = re.search(r'(\d+(?:\.\d+)?)\s*(ml|l|liter|litre|oz)?', value, re.IGNORECASE)
        if match:
            return {
                'capacity': float(match.group(1)),
                'capacityUnit': match.group(2).lower() if match.group(2) else 'ml'
            }
        return {}
    
    def extract_percentage(self, text: str) -> Optional[int]:
        """Extract percentage value"""
        match = re.search(r'(\d+)\s*%', text)
        return int(match.group(1)) if match else None

def main():
    if len(sys.argv) != 2:
        print(json.dumps({'success': False, 'error': 'PDF file path required'}))
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    extractor = BulkPDFExtractor(pdf_path)
    result = extractor.extract_all_data()
    print(json.dumps(result, indent=2))

if __name__ == '__main__':
    main()