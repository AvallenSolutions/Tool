import { Product } from "@shared/schema";

interface LCAResults {
  carbonFootprint: number;
  waterFootprint: number;
  breakdown: {
    packaging: {
      bottle: number;
      label: number;
      closure: number;
    };
    ingredients: number;
    transportation: number;
    production: number;
  };
}

// Carbon intensity factors (kg CO2e per unit)
const CARBON_FACTORS = {
  // Packaging materials (kg CO2e per kg)
  glass: 0.8,
  aluminium: 8.24,
  PET: 2.2,
  paper: 0.9,
  tetrapak: 0.5,
  cork: 0.1,
  plastic: 2.5,
  metal: 5.0,
  synthetic: 3.0,
  vinyl: 4.0,
  foil: 8.0,
  screw: 2.0,
  
  // Production processes (kg CO2e per unit)
  own_production: 0.5,
  contract_production: 0.7,
  hybrid_production: 0.6,
  
  // Transportation (kg CO2e per km per kg)
  transport_factor: 0.0001,
  
  // Base ingredient factors (kg CO2e per kg)
  base_ingredient: 0.5,
};

// Water consumption factors (L per unit)
const WATER_FACTORS = {
  // Packaging materials (L per kg)
  glass: 1.5,
  aluminium: 155,
  PET: 17,
  paper: 20,
  tetrapak: 15,
  cork: 2,
  plastic: 17,
  metal: 100,
  synthetic: 25,
  vinyl: 30,
  foil: 155,
  screw: 17,
  
  // Production processes (L per unit)
  own_production: 10,
  contract_production: 15,
  hybrid_production: 12,
  
  // Base ingredient factors (L per kg)
  base_ingredient: 5,
};

export async function calculateProductLCA(product: Product): Promise<LCAResults> {
  let totalCarbon = 0;
  let totalWater = 0;
  
  const breakdown = {
    packaging: {
      bottle: 0,
      label: 0,
      closure: 0,
    },
    ingredients: 0,
    transportation: 0,
    production: 0,
  };

  // Calculate packaging emissions
  if (product.bottleMaterial && product.bottleWeight) {
    const bottleWeightKg = parseFloat(product.bottleWeight.toString()) / 1000; // Convert grams to kg
    const carbonFactor = CARBON_FACTORS[product.bottleMaterial as keyof typeof CARBON_FACTORS] || CARBON_FACTORS.glass;
    const waterFactor = WATER_FACTORS[product.bottleMaterial as keyof typeof WATER_FACTORS] || WATER_FACTORS.glass;
    
    breakdown.packaging.bottle = bottleWeightKg * carbonFactor;
    totalCarbon += breakdown.packaging.bottle;
    totalWater += bottleWeightKg * waterFactor;
    
    // Apply recycled content reduction
    if (product.bottleRecycledContent) {
      const recycledReduction = parseFloat(product.bottleRecycledContent.toString()) / 100;
      breakdown.packaging.bottle *= (1 - recycledReduction * 0.5); // 50% reduction for recycled content
      totalCarbon -= breakdown.packaging.bottle * recycledReduction * 0.5;
      totalWater -= bottleWeightKg * waterFactor * recycledReduction * 0.3; // 30% water reduction
    }
  }

  // Calculate label emissions
  if (product.labelMaterial && product.labelWeight) {
    const labelWeightKg = parseFloat(product.labelWeight.toString()) / 1000; // Convert grams to kg
    const carbonFactor = CARBON_FACTORS[product.labelMaterial as keyof typeof CARBON_FACTORS] || CARBON_FACTORS.paper;
    const waterFactor = WATER_FACTORS[product.labelMaterial as keyof typeof WATER_FACTORS] || WATER_FACTORS.paper;
    
    breakdown.packaging.label = labelWeightKg * carbonFactor;
    totalCarbon += breakdown.packaging.label;
    totalWater += labelWeightKg * waterFactor;
  }

  // Calculate closure emissions
  if (!product.hasBuiltInClosure && product.closureMaterial && product.closureWeight) {
    const closureWeightKg = parseFloat(product.closureWeight.toString()) / 1000; // Convert grams to kg
    const carbonFactor = CARBON_FACTORS[product.closureMaterial as keyof typeof CARBON_FACTORS] || CARBON_FACTORS.cork;
    const waterFactor = WATER_FACTORS[product.closureMaterial as keyof typeof WATER_FACTORS] || WATER_FACTORS.cork;
    
    breakdown.packaging.closure = closureWeightKg * carbonFactor;
    totalCarbon += breakdown.packaging.closure;
    totalWater += closureWeightKg * waterFactor;
  }

  // Calculate ingredient emissions
  if (product.ingredients && Array.isArray(product.ingredients)) {
    for (const ingredient of product.ingredients) {
      if (ingredient.amount && ingredient.unit) {
        let amountKg = ingredient.amount;
        
        // Convert to kg if needed
        if (ingredient.unit === 'g') {
          amountKg = ingredient.amount / 1000;
        } else if (ingredient.unit === 'ml') {
          amountKg = ingredient.amount / 1000; // Approximate density of 1 g/ml
        } else if (ingredient.unit === 'L') {
          amountKg = ingredient.amount; // Approximate density of 1 kg/L
        }
        
        const ingredientCarbon = amountKg * CARBON_FACTORS.base_ingredient;
        const ingredientWater = amountKg * WATER_FACTORS.base_ingredient;
        
        breakdown.ingredients += ingredientCarbon;
        totalCarbon += ingredientCarbon;
        totalWater += ingredientWater;
      }
    }
  }

  // Calculate production emissions
  if (product.productionModel) {
    const productionFactor = CARBON_FACTORS[`${product.productionModel}_production` as keyof typeof CARBON_FACTORS] || CARBON_FACTORS.own_production;
    const productionWater = WATER_FACTORS[`${product.productionModel}_production` as keyof typeof WATER_FACTORS] || WATER_FACTORS.own_production;
    
    breakdown.production = productionFactor;
    totalCarbon += breakdown.production;
    totalWater += productionWater;
  }

  // Calculate transportation emissions (simplified)
  // Assume average transportation distance of 500km
  const averageDistance = 500; // km
  const productWeightKg = (
    (product.bottleWeight ? parseFloat(product.bottleWeight.toString()) / 1000 : 0) +
    (product.labelWeight ? parseFloat(product.labelWeight.toString()) / 1000 : 0) +
    (product.closureWeight ? parseFloat(product.closureWeight.toString()) / 1000 : 0) +
    0.5 // Approximate product content weight
  );
  
  breakdown.transportation = productWeightKg * averageDistance * CARBON_FACTORS.transport_factor;
  totalCarbon += breakdown.transportation;

  // Round to 4 decimal places for carbon footprint and 2 for water
  return {
    carbonFootprint: Math.round(totalCarbon * 10000) / 10000,
    waterFootprint: Math.round(totalWater * 100) / 100,
    breakdown
  };
}