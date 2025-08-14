import { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface HelpContent {
  whatItIs: string;
  whyItMatters: string;
  whereToFind: string;
}

interface ContextualHelpProps {
  fieldKey: string;
  size?: 'sm' | 'md' | 'lg';
}

// Centralized help content - in production this would come from a JSON file or API
const HELP_CONTENT: Record<string, HelpContent> = {
  // Product Information
  'product.name': {
    whatItIs: 'The commercial name of your product as it appears to customers',
    whyItMatters: 'Helps identify and track environmental impact for each specific product in your portfolio',
    whereToFind: 'Product packaging, marketing materials, or your product catalog'
  },
  'product.sku': {
    whatItIs: 'Stock Keeping Unit - a unique identifier for inventory tracking',
    whyItMatters: 'Ensures accurate data linking between sustainability metrics and business operations',
    whereToFind: 'Your inventory management system, product database, or internal catalog'
  },
  'product.volume': {
    whatItIs: 'The volume of liquid in each container (e.g., 750ml, 500ml)',
    whyItMatters: 'Critical for calculating emissions per unit and comparing environmental efficiency across different sizes',
    whereToFind: 'Product label, technical specifications, or packaging design documents'
  },
  
  // Packaging Information
  'packaging.bottleMaterial': {
    whatItIs: 'The primary material used for your product container',
    whyItMatters: 'Different materials have vastly different carbon footprints - glass typically has 3-4x higher emissions than aluminum',
    whereToFind: 'Supplier specifications, packaging design documents, or contact your packaging supplier'
  },
  'packaging.bottleWeight': {
    whatItIs: 'The weight of the empty container in grams',
    whyItMatters: 'Heavier packaging significantly increases carbon footprint through material production and transportation',
    whereToFind: 'Supplier technical sheets, packaging specifications, or weigh an empty container'
  },
  'packaging.recycledContent': {
    whatItIs: 'Percentage of recycled material in your packaging',
    whyItMatters: 'Recycled content can reduce carbon footprint by 20-40% compared to virgin materials',
    whereToFind: 'Supplier sustainability reports, packaging certifications, or contact your packaging supplier'
  },
  
  // Ingredient Information
  'ingredients.origin': {
    whatItIs: 'Geographic location where the ingredient was grown or produced',
    whyItMatters: 'Transportation distance is a major factor in carbon footprint - local sourcing can reduce emissions by 10-30%',
    whereToFind: 'Supplier certificates, product traceability documents, or direct communication with suppliers'
  },
  'ingredients.organic': {
    whatItIs: 'Whether the ingredient is certified organic',
    whyItMatters: 'Organic farming typically has 10-20% lower carbon footprint due to reduced synthetic fertilizer use',
    whereToFind: 'Organic certification documents, supplier specifications, or ingredient labels'
  },
  'ingredients.transportDistance': {
    whatItIs: 'Distance the ingredient traveled from origin to your facility',
    whyItMatters: 'Transportation accounts for 5-15% of total product carbon footprint depending on distance and mode',
    whereToFind: 'Supplier delivery documentation, logistics reports, or calculate using supplier location'
  },
  
  // Production Information
  'production.annualVolume': {
    whatItIs: 'Total volume of this product you produce per year',
    whyItMatters: 'Allows calculation of per-unit impacts and helps identify your highest-impact products for priority action',
    whereToFind: 'Production planning documents, inventory reports, or sales data'
  },
  'production.energySource': {
    whatItIs: 'Type of energy used in your production facility (grid, solar, etc.)',
    whyItMatters: 'Renewable energy can reduce production emissions by 40-70% compared to fossil fuel electricity',
    whereToFind: 'Utility bills, energy contracts, or facilities management documentation'
  },
  
  // Goals & KPIs
  'goals.targetValue': {
    whatItIs: 'The specific numeric target you want to achieve for this sustainability metric',
    whyItMatters: 'SMART goals with specific targets are 2-3x more likely to be achieved than vague commitments',
    whereToFind: 'Industry benchmarks, regulatory requirements, or your sustainability strategy documents'
  },
  'goals.targetDate': {
    whatItIs: 'The deadline by which you want to achieve your sustainability target',
    whyItMatters: 'Time-bound goals create accountability and allow progress tracking against milestones',
    whereToFind: 'Corporate sustainability commitments, regulatory deadlines, or stakeholder requirements'
  },
  'kpi.carbonFootprint': {
    whatItIs: 'Total greenhouse gas emissions from your operations and products, measured in CO2 equivalent',
    whyItMatters: 'Primary metric for climate impact - required for carbon neutral claims and increasingly demanded by customers',
    whereToFind: 'LCA calculations, carbon accounting software, or sustainability reporting tools'
  }
};

export function ContextualHelp({ fieldKey, size = 'sm' }: ContextualHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const content = HELP_CONTENT[fieldKey];
  
  if (!content) {
    return null; // Don't render if no help content available
  }

  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-5 h-5' : 'w-6 h-6';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors ${iconSize}`}
          aria-label="Get help for this field"
        >
          <HelpCircle className={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 bg-white border shadow-lg" align="start">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-900">
              Field Help
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div>
              <h4 className="text-sm font-medium text-green-700 mb-1">What It Is</h4>
              <p className="text-sm text-gray-600">{content.whatItIs}</p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium text-blue-700 mb-1">Why It Matters</h4>
              <p className="text-sm text-gray-600">{content.whyItMatters}</p>
            </div>
            
            <Separator />
            
            <div>
              <h4 className="text-sm font-medium text-purple-700 mb-1">Where to Find It</h4>
              <p className="text-sm text-gray-600">{content.whereToFind}</p>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}