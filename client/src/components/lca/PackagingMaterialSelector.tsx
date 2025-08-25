import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Droplets, Zap, TreePine, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { UseFormReturn } from 'react-hook-form';

interface MaterialWithImpact {
  materialName: string;
  unit: string;
  subcategory: string;
  impact?: {
    co2: number; // kg CO2eq per unit
    water: number; // L per unit  
    energy: number; // MJ per unit
  };
}

interface PackagingMaterialSelectorProps {
  form: UseFormReturn<any>;
  fieldName: string;
  category: 'Container Materials' | 'Label Materials' | 'Printing Materials' | 'Closure Materials' | 'Secondary Packaging' | 'Protective Materials';
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  onMaterialChange?: (materialName: string) => void;
}

export function PackagingMaterialSelector({ 
  form, 
  fieldName, 
  category, 
  label,
  placeholder,
  description,
  disabled = false,
  onMaterialChange
}: PackagingMaterialSelectorProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [impactFilter, setImpactFilter] = useState<'low' | 'medium' | 'high' | 'all'>('all');

  // Fetch packaging materials for the selected category with impact data
  const { data: rawMaterials = [], isLoading, error } = useQuery<{materialName: string; unit: string; subcategory: string}[]>({
    queryKey: ['/api/lca/ingredients', category],
    queryFn: async () => {
      const response = await fetch(`/api/lca/ingredients?subcategory=${encodeURIComponent(category)}`);
      if (!response.ok) throw new Error('Failed to fetch packaging materials');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(category),
  });

  // Fetch impact data for materials
  const { data: impactData } = useQuery<Record<string, {co2: number; water: number; energy: number}>>({
    queryKey: ['/api/lca/packaging-impact', category],
    queryFn: async () => {
      const response = await fetch(`/api/lca/packaging-impact?category=${encodeURIComponent(category)}`);
      if (!response.ok) {
        // Fallback to local impact calculation based on category
        return getLocalImpactData(category, rawMaterials);
      }
      return response.json();
    },
    enabled: Boolean(category) && rawMaterials.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Enhance materials with impact data
  const materialsWithImpact: MaterialWithImpact[] = rawMaterials.map(material => ({
    ...material,
    impact: impactData?.[material.materialName] || getEstimatedImpact(material.materialName, category)
  }));

  // Filter and search materials
  const filteredMaterials = materialsWithImpact.filter(material => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      if (!material.materialName.toLowerCase().includes(query)) {
        return false;
      }
    }

    // Impact filter
    if (impactFilter !== 'all' && material.impact) {
      const impactLevel = getImpactLevel(material.impact.co2);
      if (impactLevel !== impactFilter) {
        return false;
      }
    }

    return true;
  });

  // Sort by CO2 impact (ascending)
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    const aImpact = a.impact?.co2 || 999;
    const bImpact = b.impact?.co2 || 999;
    return aImpact - bImpact;
  });

  // Generate default values if not provided
  const defaultLabel = label || `${category.replace(' Materials', '')} Material`;
  const defaultPlaceholder = placeholder || (
    isLoading 
      ? "Loading materials..." 
      : `Select ${category.toLowerCase().replace(' materials', '')} material`
  );

  console.log('🔍 PackagingMaterialSelector:', {
    category,
    fieldName,
    materialsCount: rawMaterials.length,
    filteredCount: filteredMaterials.length,
    isLoading,
    searchQuery,
    impactFilter
  });

  const handleMaterialChange = (materialName: string) => {
    form.setValue(fieldName, materialName);
    
    if (onMaterialChange) {
      onMaterialChange(materialName);
    }
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="flex items-center justify-between">
            {defaultLabel}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="h-6 px-2"
            >
              <Filter className="h-3 w-3 mr-1" />
              Filters
            </Button>
          </FormLabel>
          
          {/* Advanced Search and Filters */}
          {showAdvancedFilters && (
            <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search materials..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Impact Level:</span>
                <div className="flex gap-1">
                  {(['all', 'low', 'medium', 'high'] as const).map((level) => (
                    <Button
                      key={level}
                      type="button"
                      variant={impactFilter === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImpactFilter(level)}
                      className="h-7 px-2 text-xs"
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <Select 
            onValueChange={handleMaterialChange}
            value={field.value}
            disabled={disabled || isLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={defaultPlaceholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {sortedMaterials.map((material, idx) => (
                <SelectItem 
                  key={`${material.materialName}-${idx}`} 
                  value={material.materialName}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{material.materialName}</span>
                    {material.impact && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {material.impact.co2.toFixed(2)} kg CO₂eq
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
              {sortedMaterials.length === 0 && !isLoading && (
                <div className="p-3 text-center text-sm text-muted-foreground">
                  {searchQuery ? 'No materials match your search' : 'No materials available'}
                </div>
              )}
            </SelectContent>
          </Select>
          
          <FormDescription>
            {description || (
              <div className="flex items-center gap-4 text-xs">
                <span>{filteredMaterials.length} materials available</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <TreePine className="h-3 w-3" />kg CO₂e
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="h-3 w-3" />L H₂O
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />MJ
                  </span>
                </div>
              </div>
            )}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Helper functions for impact data and styling
function getLocalImpactData(category: string, materials: {materialName: string}[]): Record<string, {co2: number; water: number; energy: number}> {
  const categoryImpacts = getCategoryDefaultImpacts(category);
  const result: Record<string, {co2: number; water: number; energy: number}> = {};
  
  materials.forEach(material => {
    result[material.materialName] = getEstimatedImpact(material.materialName, category);
  });
  
  return result;
}

function getEstimatedImpact(materialName: string, category: string): {co2: number; water: number; energy: number} {
  const categoryDefaults = getCategoryDefaultImpacts(category);
  
  // Material-specific adjustments
  const nameLower = materialName.toLowerCase();
  let multiplier = 1.0;
  
  if (nameLower.includes('recycled') || nameLower.includes('bio')) multiplier = 0.7;
  else if (nameLower.includes('virgin') || nameLower.includes('new')) multiplier = 1.3;
  else if (nameLower.includes('aluminum') || nameLower.includes('metal')) multiplier = 1.8;
  else if (nameLower.includes('plastic') || nameLower.includes('pet')) multiplier = 1.4;
  else if (nameLower.includes('glass')) multiplier = 1.2;
  else if (nameLower.includes('paper') || nameLower.includes('cardboard')) multiplier = 0.8;
  
  return {
    co2: categoryDefaults.co2 * multiplier,
    water: categoryDefaults.water * multiplier,
    energy: categoryDefaults.energy * multiplier
  };
}

function getCategoryDefaultImpacts(category: string): {co2: number; water: number; energy: number} {
  const impacts: Record<string, {co2: number; water: number; energy: number}> = {
    'Container Materials': { co2: 0.85, water: 15, energy: 12.5 },
    'Label Materials': { co2: 1.2, water: 35, energy: 18.5 },
    'Printing Materials': { co2: 2.1, water: 85, energy: 25.4 },
    'Closure Materials': { co2: 1.85, water: 8, energy: 14.2 },
    'Secondary Packaging': { co2: 0.65, water: 25, energy: 8.5 },
    'Protective Materials': { co2: 3.2, water: 45, energy: 35.8 }
  };
  
  return impacts[category] || { co2: 1.0, water: 20, energy: 15 };
}

function getImpactLevel(co2: number): 'low' | 'medium' | 'high' {
  if (co2 <= 1.0) return 'low';
  if (co2 <= 2.0) return 'medium';
  return 'high';
}

function getImpactBadgeStyle(co2: number): string {
  const level = getImpactLevel(co2);
  switch (level) {
    case 'low': return 'border-green-200 text-green-800 bg-green-50';
    case 'medium': return 'border-yellow-200 text-yellow-800 bg-yellow-50';
    case 'high': return 'border-red-200 text-red-800 bg-red-50';
    default: return '';
  }
}