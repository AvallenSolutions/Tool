import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface IngredientSelectorProps {
  form: UseFormReturn<any>;
  index: number;
  selectedCategory: string | undefined;
}

export function IngredientSelector({ form, index, selectedCategory }: IngredientSelectorProps) {
  // Fetch ingredients for the selected category
  const { data: categoryIngredients = [], isLoading, error } = useQuery<{materialName: string; unit: string; subcategory: string}[]>({
    queryKey: ['/api/lca/ingredients', selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      const response = await fetch(`/api/lca/ingredients?subcategory=${encodeURIComponent(selectedCategory)}`);
      if (!response.ok) throw new Error('Failed to fetch ingredients');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(selectedCategory),
  });

  console.log('🔍 IngredientSelector - Category:', selectedCategory, 'Ingredients:', categoryIngredients.length, 'Loading:', isLoading, 'Error:', error);

  return (
    <FormField
      control={form.control}
      name={`ingredients.${index}.name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Material Name *</FormLabel>
          <Select 
            onValueChange={field.onChange} 
            value={field.value}
            disabled={!selectedCategory || isLoading}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    !selectedCategory 
                      ? "Select category first" 
                      : isLoading 
                        ? "Loading ingredients..." 
                        : "Select OpenLCA material"
                  } 
                />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categoryIngredients.map((ingredient, idx) => (
                <SelectItem key={`${ingredient.materialName}-${idx}`} value={ingredient.materialName}>
                  {ingredient.materialName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            {selectedCategory 
              ? `Select from ${selectedCategory.toLowerCase()} ingredients`
              : "Choose a category first to see available ingredients"
            }
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}