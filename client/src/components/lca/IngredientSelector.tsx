import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X, Leaf } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

export interface IngredientInput {
  id: string;
  materialName: string;
  amount: number;
  unit: string;
}

interface IngredientSelectorProps {
  ingredients: IngredientInput[];
  onChange: (ingredients: IngredientInput[]) => void;
  className?: string;
}

interface AvailableIngredient {
  materialName: string;
  unit: string;
}

export function IngredientSelector({ ingredients, onChange, className }: IngredientSelectorProps) {
  // Fetch available ingredients from OpenLCA process mappings
  const { data: availableIngredients = [], isLoading } = useQuery<AvailableIngredient[]>({
    queryKey: ['/api/lca/ingredients'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const addIngredient = () => {
    const newIngredient: IngredientInput = {
      id: `ingredient-${Date.now()}`,
      materialName: '',
      amount: 0,
      unit: 'kg'
    };
    onChange([...ingredients, newIngredient]);
  };

  const updateIngredient = (id: string, field: keyof IngredientInput, value: string | number) => {
    const updatedIngredients = ingredients.map(ingredient => 
      ingredient.id === id 
        ? { ...ingredient, [field]: value }
        : ingredient
    );
    onChange(updatedIngredients);
  };

  const removeIngredient = (id: string) => {
    const filteredIngredients = ingredients.filter(ingredient => ingredient.id !== id);
    onChange(filteredIngredients);
  };

  // Auto-set unit when ingredient is selected
  const handleIngredientSelect = (id: string, materialName: string) => {
    const selectedIngredient = availableIngredients.find(ing => ing.materialName === materialName);
    updateIngredient(id, 'materialName', materialName);
    if (selectedIngredient?.unit) {
      updateIngredient(id, 'unit', selectedIngredient.unit);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Leaf className="h-4 w-4 text-green-600" />
            Agricultural Ingredients
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Add each agricultural ingredient that goes into your product. Our tool will automatically calculate 
            the full upstream environmental footprint using the globally recognized ecoinvent database.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="grid grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-gray-50">
              <div className="col-span-5">
                <Label htmlFor={`ingredient-${ingredient.id}`} className="text-sm font-medium">
                  Ingredient {index + 1}
                </Label>
                <Select 
                  value={ingredient.materialName} 
                  onValueChange={(value) => handleIngredientSelect(ingredient.id, value)}
                  disabled={isLoading}
                >
                  <SelectTrigger id={`ingredient-${ingredient.id}`}>
                    <SelectValue placeholder={isLoading ? "Loading ingredients..." : "Select ingredient"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableIngredients.map((availableIngredient) => (
                      <SelectItem 
                        key={availableIngredient.materialName} 
                        value={availableIngredient.materialName}
                      >
                        {availableIngredient.materialName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-3">
                <Label htmlFor={`amount-${ingredient.id}`} className="text-sm font-medium">
                  Amount
                </Label>
                <Input
                  id={`amount-${ingredient.id}`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={ingredient.amount || ''}
                  onChange={(e) => updateIngredient(ingredient.id, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.0"
                />
              </div>
              
              <div className="col-span-3">
                <Label htmlFor={`unit-${ingredient.id}`} className="text-sm font-medium">
                  Unit
                </Label>
                <Select 
                  value={ingredient.unit} 
                  onValueChange={(value) => updateIngredient(ingredient.id, 'unit', value)}
                >
                  <SelectTrigger id={`unit-${ingredient.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="g">g</SelectItem>
                    <SelectItem value="t">tonnes</SelectItem>
                    <SelectItem value="L">L (litres)</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="col-span-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => removeIngredient(ingredient.id)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {ingredients.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Leaf className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No ingredients added yet</p>
              <p className="text-sm">Click "Add Ingredient" to get started</p>
            </div>
          )}
          
          <Button
            type="button"
            variant="outline"
            onClick={addIngredient}
            className="w-full mt-4 border-dashed border-2 hover:border-green-300 hover:bg-green-50"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Ingredient
          </Button>
          
          {ingredients.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
              <p className="text-sm text-blue-800">
                <strong>💡 Automated Calculation:</strong> Our system will automatically calculate water use, 
                carbon emissions, energy consumption, and land use for each ingredient using scientifically 
                validated data from the ecoinvent database.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}