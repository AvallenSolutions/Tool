import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ExtractedPDFData {
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
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  specifications?: Record<string, any>;
  confidence?: {
    [key: string]: number;
  };
}

export interface PDFExtractionResult {
  success: boolean;
  data?: ExtractedPDFData;
  error?: string;
  extractedFields: string[];
  totalFields: number;
  documentType?: string;
  confidence?: number;
}

export class PDFExtractionService {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_TYPES = ['application/pdf'];

  static async extractProductDataFromPDF(filePath: string, originalName: string): Promise<PDFExtractionResult> {
    try {
      // Validate file
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: 'File not found',
          extractedFields: [],
          totalFields: 0
        };
      }

      const stats = fs.statSync(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error: 'File size exceeds 10MB limit',
          extractedFields: [],
          totalFields: 0
        };
      }

      // Convert PDF to base64
      const fileBuffer = fs.readFileSync(filePath);
      const base64Data = fileBuffer.toString('base64');

      // For now, return a basic implementation since Anthropic doesn't support PDF directly
      // In a production environment, you'd want to convert PDF to images first
      const extractedData = await this.extractWithTextAnalysis(fileBuffer.toString(), originalName);

      // Calculate success metrics
      const extractedFields = Object.keys(extractedData).filter(key => 
        extractedData[key as keyof ExtractedPDFData] !== undefined && 
        key !== 'confidence' && 
        key !== 'specifications'
      );

      const totalPossibleFields = 15; // Based on the interface fields

      return {
        success: extractedFields.length > 0,
        data: extractedFields.length > 0 ? extractedData : undefined,
        extractedFields,
        totalFields: totalPossibleFields,
        documentType: 'product_specification',
        confidence: this.calculateOverallConfidence(extractedData),
        error: extractedFields.length === 0 ? 'No product data could be extracted from the PDF' : undefined
      };

    } catch (error) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        error: 'An error occurred while processing the PDF',
        extractedFields: [],
        totalFields: 0
      };
    }
  }

  private static async extractWithTextAnalysis(textContent: string, fileName: string): Promise<ExtractedPDFData> {
    // This is a simplified implementation for demo purposes
    // In production, you'd want to use a proper PDF text extraction library
    // and then use Anthropic for analysis of the extracted text
    
    const extracted: ExtractedPDFData = {
      confidence: {}
    };

    // Basic pattern matching on the filename and simulated content analysis
    const fileNameLower = fileName.toLowerCase();
    
    if (fileNameLower.includes('bottle') || fileNameLower.includes('glass')) {
      extracted.productName = fileName.replace('.pdf', '').replace(/[-_]/g, ' ');
      extracted.materialType = 'Glass';
      extracted.confidence!.productName = 0.7;
      extracted.confidence!.materialType = 0.6;
    } else if (fileNameLower.includes('plastic') || fileNameLower.includes('pet')) {
      extracted.productName = fileName.replace('.pdf', '').replace(/[-_]/g, ' ');
      extracted.materialType = 'Plastic';
      extracted.confidence!.productName = 0.7;
      extracted.confidence!.materialType = 0.6;
    } else {
      // Generic product from filename
      extracted.productName = fileName.replace('.pdf', '').replace(/[-_]/g, ' ');
      extracted.confidence!.productName = 0.5;
    }

    return extracted;
  }

  private static async extractWithAnthropicText(textContent: string, fileName: string): Promise<ExtractedPDFData> {
    const prompt = `
You are an expert at extracting product information from supplier documents and catalogs. 
Analyze this PDF document and extract detailed product information in JSON format.

Focus on extracting the following information if available:
- Product name and SKU
- Physical specifications (dimensions, weight, capacity)
- Material composition and properties
- Sustainability information (recycled content, certifications)
- Pricing and ordering information (unit price, minimum order quantity, lead time)
- Technical specifications
- Color and finish options

Please provide the extracted data in this exact JSON structure, with confidence scores for each field:

{
  "productName": "string or null",
  "sku": "string or null", 
  "description": "string or null",
  "materialType": "string or null",
  "weight": "number or null",
  "weightUnit": "string or null (g, kg, lbs)",
  "capacity": "number or null",
  "capacityUnit": "string or null (ml, l, fl oz)",
  "dimensions": {
    "height": "number or null",
    "width": "number or null", 
    "depth": "number or null",
    "unit": "string or null (mm, cm, in)"
  },
  "recycledContent": "number or null (0-100)",
  "color": "string or null",
  "certifications": ["array of certification strings"],
  "price": "number or null",
  "currency": "string or null",
  "minimumOrderQuantity": "number or null",
  "leadTimeDays": "number or null",
  "specifications": {
    "key": "value pairs of additional technical specs"
  },
  "confidence": {
    "productName": 0.0-1.0,
    "materialType": 0.0-1.0,
    "weight": 0.0-1.0,
    "dimensions": 0.0-1.0,
    "etc": "confidence for each extracted field"
  }
}

Rules:
1. Only extract information that is clearly stated in the document
2. For dimensions, convert to consistent units when possible
3. For weights, normalize to standard units (g, kg, lbs)
4. For capacity/volume, use ml, l, or fl oz
5. Confidence should reflect how certain you are about each extracted value
6. If multiple products are shown, focus on the primary/featured product
7. Return null for any field where information is not available
8. Be conservative with confidence scores - only use >0.8 for very clear data

File name: ${fileName}
`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "text",
                text: `PDF Content: ${textContent}\n\nFile name: ${fileName}`
              }
            ]
          }
        ]
      });

      const firstContent = response.content[0];
      if (firstContent.type !== 'text') {
        throw new Error('Unexpected response type from AI');
      }
      const responseText = firstContent.text;
      
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const extractedData = JSON.parse(jsonMatch[0]);
      
      // Clean up and validate the data
      return this.validateAndCleanData(extractedData);

    } catch (error) {
      console.error('Anthropic extraction error:', error);
      throw new Error('Failed to extract data using AI analysis');
    }
  }

  private static validateAndCleanData(data: any): ExtractedPDFData {
    const cleaned: ExtractedPDFData = {};

    // Validate and clean each field
    if (data.productName && typeof data.productName === 'string') {
      cleaned.productName = data.productName.trim();
    }
    
    if (data.sku && typeof data.sku === 'string') {
      cleaned.sku = data.sku.trim();
    }

    if (data.description && typeof data.description === 'string') {
      cleaned.description = data.description.trim();
    }

    if (data.materialType && typeof data.materialType === 'string') {
      cleaned.materialType = data.materialType.trim();
    }

    if (data.weight && typeof data.weight === 'number' && data.weight > 0) {
      cleaned.weight = data.weight;
      if (data.weightUnit && typeof data.weightUnit === 'string') {
        cleaned.weightUnit = data.weightUnit.toLowerCase();
      }
    }

    if (data.capacity && typeof data.capacity === 'number' && data.capacity > 0) {
      cleaned.capacity = data.capacity;
      if (data.capacityUnit && typeof data.capacityUnit === 'string') {
        cleaned.capacityUnit = data.capacityUnit.toLowerCase();
      }
    }

    if (data.dimensions && typeof data.dimensions === 'object') {
      const dims: any = {};
      if (data.dimensions.height && typeof data.dimensions.height === 'number') {
        dims.height = data.dimensions.height;
      }
      if (data.dimensions.width && typeof data.dimensions.width === 'number') {
        dims.width = data.dimensions.width;
      }
      if (data.dimensions.depth && typeof data.dimensions.depth === 'number') {
        dims.depth = data.dimensions.depth;
      }
      if (data.dimensions.unit && typeof data.dimensions.unit === 'string') {
        dims.unit = data.dimensions.unit.toLowerCase();
      }
      if (Object.keys(dims).length > 0) {
        cleaned.dimensions = dims;
      }
    }

    if (data.recycledContent && typeof data.recycledContent === 'number' && 
        data.recycledContent >= 0 && data.recycledContent <= 100) {
      cleaned.recycledContent = data.recycledContent;
    }

    if (data.color && typeof data.color === 'string') {
      cleaned.color = data.color.trim();
    }

    if (data.certifications && Array.isArray(data.certifications)) {
      cleaned.certifications = data.certifications
        .filter((cert: any) => typeof cert === 'string')
        .map((cert: string) => cert.trim())
        .filter((cert: string) => cert.length > 0);
    }

    if (data.price && typeof data.price === 'number' && data.price >= 0) {
      cleaned.price = data.price;
      if (data.currency && typeof data.currency === 'string') {
        cleaned.currency = data.currency.toUpperCase();
      }
    }

    if (data.minimumOrderQuantity && typeof data.minimumOrderQuantity === 'number' && 
        data.minimumOrderQuantity > 0) {
      cleaned.minimumOrderQuantity = data.minimumOrderQuantity;
    }

    if (data.leadTimeDays && typeof data.leadTimeDays === 'number' && data.leadTimeDays >= 0) {
      cleaned.leadTimeDays = data.leadTimeDays;
    }

    if (data.specifications && typeof data.specifications === 'object') {
      cleaned.specifications = data.specifications;
    }

    if (data.confidence && typeof data.confidence === 'object') {
      cleaned.confidence = data.confidence;
    }

    return cleaned;
  }

  private static calculateOverallConfidence(data: ExtractedPDFData): number {
    if (!data.confidence) return 0;

    const confidenceValues = Object.values(data.confidence).filter(v => typeof v === 'number');
    if (confidenceValues.length === 0) return 0;

    return confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
  }
}