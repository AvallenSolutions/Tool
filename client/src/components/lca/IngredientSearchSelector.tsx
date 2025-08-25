import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";

interface IngredientSearchSelectorProps {
  form: UseFormReturn<any>;
  index: number;
}

interface Ingredient {
  materialName: string;
  unit: string;
  subcategory: string;
  co2ePerUnit?: number | null;
  waterFootprintPerUnit?: number | null;
  wasteFootprintPerUnit?: number | null;
}

export function IngredientSearchSelector({ form, index }: IngredientSearchSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);

  // Get the current form value
  const currentValue = form.watch(`ingredients.${index}.name`);

  // Search ingredients
  const { data: searchResults = [], isLoading } = useQuery<Ingredient[]>({
    queryKey: ['/api/lca/ingredients/search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const response = await fetch(`/api/lca/ingredients/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search ingredients');
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update search query when form value changes (for editing existing products)
  useEffect(() => {
    if (currentValue && !selectedIngredient) {
      setSearchQuery(currentValue);
    }
  }, [currentValue, selectedIngredient]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowSuggestions(value.length >= 2);
    
    // Clear selection if user is typing
    if (selectedIngredient && value !== selectedIngredient.materialName) {
      setSelectedIngredient(null);
    }
  };

  const handleIngredientSelect = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setSearchQuery(ingredient.materialName);
    setShowSuggestions(false);
    
    // Update form values
    form.setValue(`ingredients.${index}.name`, ingredient.materialName);
    form.setValue(`ingredients.${index}.unit`, ingredient.unit);
    form.setValue(`ingredients.${index}.category`, ingredient.subcategory);
  };

  const handleClearSelection = () => {
    setSelectedIngredient(null);
    setSearchQuery("");
    setShowSuggestions(false);
    form.setValue(`ingredients.${index}.name`, "");
    form.setValue(`ingredients.${index}.unit`, "kg");
    form.setValue(`ingredients.${index}.category`, "");
  };

  return (
    <FormField
      control={form.control}
      name={`ingredients.${index}.name`}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Search OpenLCA Database *</FormLabel>
          <FormControl>
            <div className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  {...field}
                  value={searchQuery}
                  onChange={(e) => {
                    handleSearchChange(e.target.value);
                    field.onChange(e.target.value);
                  }}
                  onFocus={() => setShowSuggestions(searchQuery.length >= 2)}
                  placeholder="Type to search ingredients (e.g., 'molasses', 'wheat', 'apple')..."
                  className="pl-10 pr-10"
                />
                {selectedIngredient && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearSelection}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Selected Ingredient Info */}
              {selectedIngredient && (
                <div className="mt-2 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-avallen-green/10 text-avallen-green border-avallen-green/20">
                    {selectedIngredient.subcategory}
                  </Badge>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {selectedIngredient.unit}
                  </Badge>
                  {selectedIngredient.co2ePerUnit !== null && selectedIngredient.co2ePerUnit !== undefined && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {selectedIngredient.co2ePerUnit.toFixed(3)} kg CO₂e/{selectedIngredient.unit}
                    </Badge>
                  )}
                  {selectedIngredient.waterFootprintPerUnit !== null && selectedIngredient.waterFootprintPerUnit !== undefined && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      {selectedIngredient.waterFootprintPerUnit.toFixed(1)} L H₂O/{selectedIngredient.unit}
                    </Badge>
                  )}
                  {selectedIngredient.wasteFootprintPerUnit !== null && selectedIngredient.wasteFootprintPerUnit !== undefined && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      {selectedIngredient.wasteFootprintPerUnit.toFixed(2)} m² waste/{selectedIngredient.unit}
                    </Badge>
                  )}
                </div>
              )}

              {/* Search Results Dropdown */}
              {showSuggestions && searchQuery.length >= 2 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                  <ScrollArea className="max-h-60">
                    {isLoading && (
                      <div className="p-4 text-center text-gray-500">
                        <Search className="w-4 h-4 animate-pulse mx-auto mb-2" />
                        Searching OpenLCA database...
                      </div>
                    )}
                    
                    {!isLoading && searchResults.length === 0 && searchQuery.length >= 2 && (
                      <div className="p-4 text-center text-gray-500">
                        <div className="text-sm">No ingredients found for "{searchQuery}"</div>
                        <div className="text-xs text-gray-400 mt-1">
                          Try different keywords or check spelling
                        </div>
                      </div>
                    )}
                    
                    {!isLoading && searchResults.map((ingredient, idx) => (
                      <button
                        key={`${ingredient.materialName}-${idx}`}
                        type="button"
                        onClick={() => handleIngredientSelect(ingredient)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-avallen-green/5"
                      >
                        <div className="font-medium text-gray-900">
                          {ingredient.materialName}
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                            {ingredient.subcategory}
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                            {ingredient.unit}
                          </Badge>
                          {ingredient.co2ePerUnit !== null && ingredient.co2ePerUnit !== undefined && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600">
                              {ingredient.co2ePerUnit.toFixed(3)} kg CO₂e/{ingredient.unit}
                            </Badge>
                          )}
                          {ingredient.waterFootprintPerUnit !== null && ingredient.waterFootprintPerUnit !== undefined && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600">
                              {ingredient.waterFootprintPerUnit.toFixed(1)} L H₂O/{ingredient.unit}
                            </Badge>
                          )}
                          {ingredient.wasteFootprintPerUnit !== null && ingredient.wasteFootprintPerUnit !== undefined && (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-600">
                              {ingredient.wasteFootprintPerUnit.toFixed(2)} m² waste/{ingredient.unit}
                            </Badge>
                          )}
                        </div>
                      </button>
                    ))}
                  </ScrollArea>
                </div>
              )}
            </div>
          </FormControl>
          <FormDescription>
            Search the complete OpenLCA ecoinvent database. Type at least 2 characters to see suggestions.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}