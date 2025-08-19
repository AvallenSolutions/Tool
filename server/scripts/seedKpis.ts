import { db } from "../db";
import { kpiDefinitions } from "@shared/schema";

const kpiDefinitionsData = [
  // Environmental KPIs
  {
    kpiName: "Carbon Intensity per Bottle",
    kpiCategory: "Environmental",
    unit: "kg CO₂e/bottle",
    formulaJson: {
      numerator: "totalCarbonEmissions",
      denominator: "totalBottlesProduced",
      calculation_type: "ratio" as const,
      description: "Total carbon emissions divided by total bottles produced"
    },
    description: "Measures the carbon footprint per bottle produced, enabling direct comparison of product efficiency"
  },
  {
    kpiName: "Total Carbon Emissions",
    kpiCategory: "Environmental",
    unit: "tonnes CO₂e",
    formulaJson: {
      numerator: "scope1Emissions + scope2Emissions + scope3Emissions",
      calculation_type: "absolute" as const,
      description: "Sum of all scope 1, 2, and 3 emissions"
    },
    description: "Total greenhouse gas emissions across all operational scopes"
  },
  {
    kpiName: "Water Efficiency",
    kpiCategory: "Environmental",
    unit: "L/bottle",
    formulaJson: {
      numerator: "totalWaterUsage",
      denominator: "totalBottlesProduced",
      calculation_type: "ratio" as const,
      description: "Total water consumption per bottle produced"
    },
    description: "Water consumption efficiency per unit of production"
  },
  {
    kpiName: "Waste Reduction",
    kpiCategory: "Environmental",
    unit: "%",
    formulaJson: {
      numerator: "(wasteGenerated - wasteRecycled) / wasteGenerated * 100",
      calculation_type: "percentage" as const,
      description: "Percentage of waste diverted from landfill"
    },
    description: "Percentage of total waste that is recycled or diverted from landfill"
  },
  {
    kpiName: "Renewable Energy Usage",
    kpiCategory: "Environmental",
    unit: "%",
    formulaJson: {
      numerator: "renewableEnergyConsumption / totalEnergyConsumption * 100",
      calculation_type: "percentage" as const,
      description: "Percentage of total energy from renewable sources"
    },
    description: "Proportion of energy consumption from renewable sources"
  },
  
  // Supply Chain KPIs
  {
    kpiName: "Supplier Verification Rate",
    kpiCategory: "Supply Chain",
    unit: "%",
    formulaJson: {
      numerator: "verifiedSuppliers / totalSuppliers * 100",
      calculation_type: "percentage" as const,
      description: "Percentage of suppliers with verified sustainability credentials"
    },
    description: "Percentage of suppliers that have completed sustainability verification"
  },
  {
    kpiName: "Local Sourcing Percentage",
    kpiCategory: "Supply Chain",
    unit: "%",
    formulaJson: {
      numerator: "localSuppliers / totalSuppliers * 100",
      calculation_type: "percentage" as const,
      description: "Percentage of suppliers within defined local radius"
    },
    description: "Percentage of raw materials sourced from local suppliers"
  },
  
  // Production KPIs
  {
    kpiName: "Production Efficiency",
    kpiCategory: "Production",
    unit: "bottles/kWh",
    formulaJson: {
      numerator: "totalBottlesProduced",
      denominator: "totalEnergyConsumed",
      calculation_type: "ratio" as const,
      description: "Number of bottles produced per kilowatt-hour of energy"
    },
    description: "Energy efficiency of production processes"
  }
];

export async function seedKpiDefinitions() {
  try {
    console.log("Seeding KPI definitions...");
    
    // Check if KPI definitions already exist
    const existingKpis = await db.select().from(kpiDefinitions);
    
    if (existingKpis.length > 0) {
      console.log(`Found ${existingKpis.length} existing KPI definitions. Skipping seed.`);
      return;
    }
    
    // Insert all KPI definitions
    await db.insert(kpiDefinitions).values(kpiDefinitionsData);
    
    console.log(`Successfully seeded ${kpiDefinitionsData.length} KPI definitions`);
  } catch (error) {
    console.error("Error seeding KPI definitions:", error);
    throw error;
  }
}

// Run if called directly
seedKpiDefinitions()
  .then(() => {
    console.log("KPI seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("KPI seeding failed:", error);
    process.exit(1);
  });