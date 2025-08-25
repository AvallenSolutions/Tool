import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

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
  
  // Fetch packaging materials for the selected category
  const { data: categoryMaterials = [], isLoading, error } = useQuery<{materialName: string; unit: string; subcategory: string}[]>({
    queryKey: ['/api/lca/ingredients', category],
    queryFn: async () => {
      const response = await fetch(`/api/lca/ingredients?subcategory=${encodeURIComponent(category)}`);
      if (!response.ok) throw new Error('Failed to fetch packaging materials');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(category),
  });

  // Generate default values if not provided
  const defaultLabel = label || `${category.replace(' Materials', '')} Material`;
  const defaultPlaceholder = placeholder || (
    isLoading 
      ? "Loading materials..." 
      : `Select ${category.toLowerCase().replace(' materials', '')} material`
  );
  const defaultDescription = description || `Select from ${categoryMaterials.length} available ${category.toLowerCase()}`;

  console.log('🔍 PackagingMaterialSelector:', {
    category,
    fieldName,
    materialsCount: categoryMaterials.length,
    isLoading,
    error: error?.message
  });

  const handleMaterialChange = (materialName: string) => {
    // Call the form's onChange
    form.setValue(fieldName, materialName);
    
    // Call custom onChange if provided
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
          <FormLabel>{defaultLabel}</FormLabel>
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
              {categoryMaterials.map((material, idx) => (
                <SelectItem 
                  key={`${material.materialName}-${idx}`} 
                  value={material.materialName}
                >
                  {material.materialName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {defaultDescription}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}