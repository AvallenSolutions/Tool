import { db } from "../db";
import { kpiDefinitions } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    kpiName: "Carbon Intensity",
    kpiCategory: "Environmental",
    unit: "kg CO₂e/L",
    formulaJson: {
      numerator: "totalCarbonEmissions",
      denominator: "totalLitersProduced", 
      calculation_type: "ratio" as const,
      description: "Total carbon emissions (in kg) divided by total liters produced"
    },
    description: "Carbon footprint per liter of product produced - enables precise environmental impact measurement and benchmarking"
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
    id: "91bc4cba-d22a-40c8-92f0-a17876c2dc35", // CRITICAL: Use stable ID to update existing KPI
    kpiName: "Waste Diversion from Landfill (%)",
    kpiCategory: "Environmental",
    unit: "%",
    formulaJson: {
      dataPoint: "wasteDiversionFromLandfillPercentage", // CRITICAL FIX: Use dataPoint format instead of complex numerator
      calculation_type: "percentage" as const,
      description: "Percentage of waste diverted from landfill disposal to recycling, composting, anaerobic digestion, animal feed and other circular routes"
    },
    description: "Measures company's circularity performance by calculating the percentage of waste diverted from landfill disposal to circular routes"
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
    
    // CRITICAL FIX: Use upsert logic with ID-based matching to prevent duplicates
    for (const kpiDef of kpiDefinitionsData) {
      let existingKpi;
      
      // Check by ID first (for records that have explicit IDs)
      if ('id' in kpiDef) {
        existingKpi = await db
          .select()
          .from(kpiDefinitions)
          .where(eq(kpiDefinitions.id, kpiDef.id as string))
          .limit(1);
      }
      
      // Fall back to name-based matching if no ID match found
      if (!existingKpi || existingKpi.length === 0) {
        existingKpi = await db
          .select()
          .from(kpiDefinitions)
          .where(eq(kpiDefinitions.kpiName, kpiDef.kpiName))
          .limit(1);
      }
      
      if (existingKpi && existingKpi.length > 0) {
        // Update existing KPI definition to ensure formula and description are current
        const updateData = {
          kpiCategory: kpiDef.kpiCategory,
          unit: kpiDef.unit,
          formulaJson: kpiDef.formulaJson,
          description: kpiDef.description,
          updatedAt: new Date()
        };
        
        if ('id' in kpiDef) {
          // Update by ID for precise targeting
          await db
            .update(kpiDefinitions)
            .set(updateData)
            .where(eq(kpiDefinitions.id, kpiDef.id as string));
          console.log(`✅ Updated KPI definition by ID: ${kpiDef.kpiName} (${kpiDef.id})`);
        } else {
          // Update by name as fallback
          await db
            .update(kpiDefinitions)
            .set(updateData)
            .where(eq(kpiDefinitions.kpiName, kpiDef.kpiName));
          console.log(`✅ Updated existing KPI definition: ${kpiDef.kpiName}`);
        }
      } else {
        // Insert new KPI definition
        await db.insert(kpiDefinitions).values(kpiDef);
        console.log(`➕ Inserted new KPI definition: ${kpiDef.kpiName}`);
      }
    }
    
    console.log(`Successfully processed ${kpiDefinitionsData.length} KPI definitions (upsert)`);
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