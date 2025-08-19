import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { UseFormReturn } from 'react-hook-form';

interface CategorySelectorProps {
  form: UseFormReturn<any>;
  fieldName: string;
  onCategoryChange: (category: string | null) => void;
  selectedCategory: string | null;
}

const CATEGORY_DESCRIPTIONS = {
  'Ethanol': 'Base alcohol sources and neutral spirits',
  'Grains': 'Cereal crops for fermentation and brewing',
  'Fruits': 'Fresh fruits for juice and fermentation',
  'Botanicals': 'Herbs, spices, and natural flavorings',
  'Additives': 'Sugars, water, and processing aids'
};

export function CategorySelector({ form, fieldName, onCategoryChange, selectedCategory }: CategorySelectorProps) {
  const categories = ['Ethanol', 'Grains', 'Fruits', 'Botanicals', 'Additives'];

  const handleCategoryChange = (value: string) => {
    onCategoryChange(value);
    // Reset the ingredient field when category changes
    form.setValue(fieldName.replace('category', 'name'), '');
  };

  return (
    <FormField
      control={form.control}
      name={fieldName}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Ingredient Category *</FormLabel>
          <Select 
            onValueChange={(value) => {
              field.onChange(value);
              handleCategoryChange(value);
            }} 
            value={field.value || ''}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Select ingredient category" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  <div>
                    <div className="font-medium">{category}</div>
                    <div className="text-sm text-muted-foreground">
                      {CATEGORY_DESCRIPTIONS[category as keyof typeof CATEGORY_DESCRIPTIONS]}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormDescription>
            Choose the primary category for your ingredient
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}