/**
 * Enhanced LCA Calculation Service
 * Processes granular LCA data points for accurate environmental impact assessment
 * Follows ISO 14040/14044 standards with EU PEF methodology
 */

export interface LCADataInputs {
  agriculture?: {
    mainCropType?: string;
    yieldTonPerHectare?: number;
    dieselLPerHectare?: number;
    sequestrationTonCo2PerTonCrop?: number;
    fertilizer?: {
      nitrogenKgPerHectare?: number;
      phosphorusKgPerHectare?: number;
      potassiumKgPerHectare?: number;
      organicFertilizerTonPerHectare?: number;
    };
    landUse?: {
      farmingPractice?: 'conventional' | 'organic' | 'biodynamic' | 'regenerative';
      biodiversityIndex?: number;
      soilQualityIndex?: number;
    };
  };
  inboundTransport?: {
    distanceKm?: number;
    mode?: 'truck' | 'rail' | 'ship' | 'air' | 'multimodal';
    fuelEfficiencyLper100km?: number;
    loadFactor?: number;
    refrigerationRequired?: boolean;
  };
  processing?: {
    waterM3PerTonCrop?: number;
    electricityKwhPerTonCrop?: number;
    lpgKgPerLAlcohol?: number;
    netWaterUseLPerBottle?: number;
    angelsSharePercentage?: number;
    fermentation?: {
      fermentationTime?: number;
      temperatureControl?: boolean;
      yeastType?: string;
      sugarAddedKg?: number;
    };
    distillation?: {
      distillationRounds?: number;
      energySourceType?: 'electric' | 'gas' | 'biomass' | 'steam';
      heatRecoverySystem?: boolean;
      copperUsageKg?: number;
    };
    maturation?: {
      maturationTimeMonths?: number;
      barrelType?: 'new_oak' | 'used_oak' | 'stainless_steel' | 'other';
      warehouseType?: 'traditional' | 'racked' | 'climate_controlled';
      evaporationLossPercentage?: number;
    };
  };
  packagingDetailed?: {
    container: {
      materialType?: 'glass' | 'plastic' | 'aluminum' | 'steel' | 'ceramic';
      weightGrams?: number;
      recycledContentPercentage?: number;
      manufacturingLocation?: string;
      transportDistanceKm?: number;
    };
    label?: {
      materialType?: 'paper' | 'plastic' | 'foil' | 'biodegradable';
      weightGrams?: number;
      inkType?: 'conventional' | 'eco_friendly' | 'soy_based';
      adhesiveType?: 'water_based' | 'solvent_based' | 'hot_melt';
    };
    closure?: {
      materialType?: 'cork' | 'synthetic_cork' | 'screw_cap' | 'crown_cap';
      weightGrams?: number;
      hasLiner?: boolean;
      linerMaterial?: string;
    };
    secondaryPackaging?: {
      hasBox?: boolean;
      boxMaterial?: 'cardboard' | 'wood' | 'plastic' | 'metal';
      boxWeightGrams?: number;
      protectiveMaterial?: string;
      protectiveMaterialWeightGrams?: number;
    };
  };
  distribution?: {
    avgDistanceToDcKm?: number;
    primaryTransportMode?: 'truck' | 'rail' | 'ship' | 'air';
    palletizationEfficiency?: number;
    coldChainRequirement?: boolean;
    temperatureRangeCelsius?: {
      min?: number;
      max?: number;
    };
    distributionCenters?: Array<{
      location: string;
      distanceFromProducerKm: number;
      energySource?: 'grid' | 'renewable' | 'mixed';
    }>;
  };
  endOfLifeDetailed?: {
    recyclingRatePercentage?: number;
    primaryDisposalMethod?: 'recycling' | 'landfill' | 'incineration' | 'composting';
    containerRecyclability?: {
      isRecyclable?: boolean;
      recyclingInfrastructureAvailable?: boolean;
      contaminationRate?: number;
    };
    labelRemovalRequired?: boolean;
    consumerEducationProgram?: boolean;
    takeback_program?: boolean;
  };
}

export interface EnhancedLCAResults {
  totalCarbonFootprint: number; // kg CO2e
  totalWaterFootprint: number; // L eq
  totalLandUse: number; // m2*year
  primaryEnergyDemand: number; // MJ
  breakdown: {
    agriculture: number;
    inboundTransport: number;
    processing: number;
    packaging: number;
    distribution: number;
    endOfLife: number;
  };
  detailedImpacts: {
    climateChange: number; // kg CO2e
    ozoneDepleteion: number; // kg CFC-11e
    acidification: number; // mol H+ eq
    eutrophication: number; // kg PO4 eq
    photochemicalOzoneCreation: number; // kg NMVOC eq
    waterScarcity: number; // m3 depriv
    landUse: number; // Pt
    ecotoxicity: number; // CTUe
    humanToxicity: number; // CTUh
    mineralResourceScarcity: number; // kg Sb eq
    fossilResourceScarcity: number; // kg oil eq
  };
  metadata: {
    calculationMethod: string;
    dataQuality: 'high' | 'medium' | 'low';
    uncertaintyPercentage: number;
    calculationDate: Date;
    systemBoundaries: string[];
  };
}

export class EnhancedLCACalculationService {
  
  // Emission factors (kg CO2e per unit)
  private static readonly EMISSION_FACTORS = {
    // Agriculture
    nitrogen_fertilizer: 5.6, // kg CO2e per kg N
    phosphorus_fertilizer: 1.2, // kg CO2e per kg P2O5
    potassium_fertilizer: 0.65, // kg CO2e per kg K2O
    diesel_fuel: 3.2, // kg CO2e per L
    organic_fertilizer: 0.1, // kg CO2e per kg
    
    // Transport
    truck_transport: 0.105, // kg CO2e per ton-km
    rail_transport: 0.030, // kg CO2e per ton-km
    ship_transport: 0.015, // kg CO2e per ton-km
    air_transport: 0.602, // kg CO2e per ton-km
    multimodal_transport: 0.065, // kg CO2e per ton-km (average)
    
    // Energy
    electricity_grid: 0.435, // kg CO2e per kWh (EU average)
    natural_gas: 0.2, // kg CO2e per kWh
    lpg: 0.214, // kg CO2e per kWh
    biomass: 0.04, // kg CO2e per kWh
    
    // Materials
    glass: 0.7, // kg CO2e per kg
    aluminum: 8.2, // kg CO2e per kg
    plastic: 2.3, // kg CO2e per kg
    plastic_pet: 2.3, // kg CO2e per kg
    steel: 1.8, // kg CO2e per kg
    ceramic: 1.2, // kg CO2e per kg
    cardboard: 0.7, // kg CO2e per kg
    paper: 1.1, // kg CO2e per kg
    cork: 0.3, // kg CO2e per kg
    
    // Water treatment
    water_treatment: 0.001, // kg CO2e per L
    wastewater_treatment: 0.002, // kg CO2e per L
    
    // Waste
    landfill: 0.5, // kg CO2e per kg waste
    incineration: 0.4, // kg CO2e per kg waste
    recycling_benefit: -0.3, // kg CO2e per kg recycled (credit)
  };

  // Water consumption factors (L per unit)
  private static readonly WATER_FACTORS = {
    agriculture: {
      conventional: 25, // L per kg crop
      organic: 20, // L per kg crop
      biodynamic: 18, // L per kg crop
      regenerative: 15, // L per kg crop
    },
    processing: {
      fermentation: 3, // L per L alcohol
      distillation: 8, // L per L alcohol
      bottling: 2, // L per bottle
    },
    materials: {
      glass: 2.5, // L per kg
      aluminum: 15, // L per kg
      plastic: 8, // L per kg
      steel: 12, // L per kg
      ceramic: 6, // L per kg
      paper: 25, // L per kg
    }
  };

  static async calculateEnhancedLCA(
    productData: any,
    lcaData: LCADataInputs,
    productionVolume: number = 1
  ): Promise<EnhancedLCAResults> {
    
    const breakdown = {
      agriculture: 0,
      inboundTransport: 0,
      processing: 0,
      packaging: 0,
      distribution: 0,
      endOfLife: 0
    };

    let totalWaterFootprint = 0;
    let totalLandUse = 0;
    let primaryEnergyDemand = 0;

    // 1. Agriculture & Raw Materials from actual ingredients
    let agricultureImpact = 0;
    let agricultureWater = 0;
    
    // Use actual ingredient data from OpenLCA (if available) or realistic values
    if (productData.ingredients && Array.isArray(productData.ingredients)) {
      productData.ingredients.forEach((ingredient: any) => {
        console.log(`Processing ingredient: ${ingredient.name}, amount: ${ingredient.amount}${ingredient.unit}`);
        
        // Use OpenLCA database values when available (no hardcoded factors)
        if (ingredient.carbonFootprint) {
          const ingredientCarbon = parseFloat(ingredient.carbonFootprint) * parseFloat(ingredient.amount || 0) * productionVolume;
          agricultureImpact += ingredientCarbon;
          console.log(`${ingredient.name} carbon footprint from OpenLCA: ${ingredientCarbon} kg CO₂e`);
        } else {
          // Fallback: User must provide emission factor via OpenLCA or manual input
          console.log(`⚠️ No OpenLCA data for ${ingredient.name} - manual emission factor required`);
        }
      });
    }
    
    breakdown.agriculture = agricultureImpact;

    // 2. Inbound Transport
    if (lcaData.inboundTransport) {
      const transport = lcaData.inboundTransport;
      let transportImpact = 0;

      if (transport.distanceKm && transport.mode) {
        const transportFactor = this.EMISSION_FACTORS[`${transport.mode}_transport`];
        if (transportFactor) {
          // Assume 1 kg of raw materials per bottle
          const tonnage = (productionVolume / 1000);
          transportImpact = tonnage * transport.distanceKm * transportFactor;

          // Apply load factor efficiency
          if (transport.loadFactor) {
            transportImpact = transportImpact * (100 / transport.loadFactor);
          }

          // Refrigeration additional impact
          if (transport.refrigerationRequired) {
            transportImpact *= 1.3; // 30% increase for cold transport
          }
        }
      }

      breakdown.inboundTransport = transportImpact;
    }

    // 3. Processing & Production - Requires manual input (no hardcoded estimates)
    let processingImpact = 0;
    let processingWater = 0;
    
    // Processing energy calculation from actual LCA data (user must input)
    if (lcaData.processing) {
      const proc = lcaData.processing;
      
      // Energy consumption (electricity, gas, etc.)
      if (proc.electricityKwhPerTonCrop && productData.ingredients) {
        const totalIngredientMass = productData.ingredients.reduce((total: number, ingredient: any) => {
          return total + (parseFloat(ingredient.amount) || 0);
        }, 0);
        
        const electricityUsage = proc.electricityKwhPerTonCrop * (totalIngredientMass / 1000) * productionVolume;
        processingImpact += electricityUsage * this.EMISSION_FACTORS.electricity_grid;
        primaryEnergyDemand += electricityUsage * 3.6; // Convert kWh to MJ
        
        console.log(`Processing electricity: ${electricityUsage.toFixed(2)} kWh × ${this.EMISSION_FACTORS.electricity_grid} kg CO₂e/kWh = ${(electricityUsage * this.EMISSION_FACTORS.electricity_grid).toFixed(3)} kg CO₂e`);
      }
      
      // Water treatment impact
      if (proc.waterM3PerTonCrop) {
        processingWater += proc.waterM3PerTonCrop * (productionVolume / 1000) * 1000; // Convert m3 to L
        processingImpact += processingWater * this.EMISSION_FACTORS.water_treatment;
      }
    }
    
    console.log(`Total processing impact: ${processingImpact} kg CO₂e (from user-provided data)`);
    
    // OLD SYNTHETIC DATA (commenting out):
    // if (lcaData.processing) {
    //   const proc = lcaData.processing;
    //   // Water usage
    //   if (proc.waterM3PerTonCrop) {
    //     processingWater += proc.waterM3PerTonCrop * (productionVolume / 1000) * 1000; // Convert m3 to L
    //     processingImpact += processingWater * this.EMISSION_FACTORS.water_treatment;
    //   }
    //   // Electricity consumption
    //   if (proc.electricityKwhPerTonCrop) {
    //     const electricityUsage = proc.electricityKwhPerTonCrop * (productionVolume / 1000);
    //     processingImpact += electricityUsage * this.EMISSION_FACTORS.electricity_grid;
    //     primaryEnergyDemand += electricityUsage * 3.6; // Convert kWh to MJ
    //   }
    // }

    breakdown.processing = processingImpact;

    // Add ingredient water footprint from OpenLCA data and manual entries
    if (productData.ingredients && Array.isArray(productData.ingredients)) {
      productData.ingredients.forEach((ingredient: any) => {
        if (ingredient.waterUsage) {
          const ingredientWater = parseFloat(ingredient.waterUsage) * productionVolume;
          console.log(`Adding ingredient water footprint: ${ingredient.name} = ${ingredientWater}L`);
          totalWaterFootprint += ingredientWater;
        }
        
        // Add molasses water footprint from OpenLCA data
        if (ingredient.name && ingredient.name.toLowerCase().includes('molasses')) {
          // Molasses from sugarcane typically has high water footprint
          const molassesWaterFootprint = parseFloat(ingredient.amount || 0) * 15 * productionVolume; // ~15L per kg molasses
          console.log(`Adding molasses water footprint: ${molassesWaterFootprint}L`);
          totalWaterFootprint += molassesWaterFootprint;
        }
      });
    }

    // NOTE: Water dilution is recorded at product level for future use but excluded from product water footprint
    // to prevent double-counting since it's already included in facility-level water consumption
    if (productData.waterDilution?.amount) {
      const dilutionAmount = parseFloat(productData.waterDilution.amount) || 0;
      console.log(`Water dilution recorded: ${dilutionAmount} ${productData.waterDilution.unit} per bottle (excluded from product water footprint to prevent double-counting)`);
    }

    // 4. Enhanced Packaging
    if (lcaData.packagingDetailed) {
      const pkg = lcaData.packagingDetailed;
      let packagingImpact = 0;
      let packagingWater = 0;

      // Container impact
      if (pkg.container?.materialType && pkg.container?.weightGrams) {
        const materialFactor = this.EMISSION_FACTORS[pkg.container.materialType] || 
                              this.EMISSION_FACTORS.glass;
        const containerWeight = pkg.container.weightGrams / 1000; // Convert to kg
        let containerImpact = containerWeight * materialFactor * productionVolume;

        // Recycled content benefit
        if (pkg.container.recycledContentPercentage) {
          const recyclingBenefit = containerImpact * (pkg.container.recycledContentPercentage / 100) * 0.3;
          containerImpact -= recyclingBenefit;
        }

        // Transport of packaging materials
        if (pkg.container.transportDistanceKm) {
          const packagingTransport = (containerWeight * productionVolume / 1000) * 
                                   pkg.container.transportDistanceKm * 
                                   this.EMISSION_FACTORS.truck_transport;
          containerImpact += packagingTransport;
        }

        packagingImpact += containerImpact;
        packagingWater += containerWeight * this.WATER_FACTORS.materials[pkg.container.materialType] || 
                         this.WATER_FACTORS.materials.glass;
      }

      // Label impact
      if (pkg.label?.materialType && pkg.label?.weightGrams) {
        const labelWeight = pkg.label.weightGrams / 1000; // Convert to kg
        const labelFactor = pkg.label.materialType === 'paper' ? 
                           this.EMISSION_FACTORS.paper : this.EMISSION_FACTORS.plastic_pet;
        packagingImpact += labelWeight * labelFactor * productionVolume;

        // Ink impact
        if (pkg.label.inkType === 'eco_friendly' || pkg.label.inkType === 'soy_based') {
          packagingImpact *= 0.9; // 10% reduction for eco-friendly inks
        }
      }

      // Closure impact
      if (pkg.closure?.materialType && pkg.closure?.weightGrams) {
        const closureWeight = pkg.closure.weightGrams / 1000;
        const closureFactor = pkg.closure.materialType === 'cork' ? 
                             this.EMISSION_FACTORS.cork : this.EMISSION_FACTORS.aluminum;
        packagingImpact += closureWeight * closureFactor * productionVolume;
      }

      // Secondary packaging
      if (pkg.secondaryPackaging?.hasBox && pkg.secondaryPackaging?.boxWeightGrams) {
        const boxWeight = pkg.secondaryPackaging.boxWeightGrams / 1000;
        const boxFactor = this.EMISSION_FACTORS.cardboard;
        packagingImpact += boxWeight * boxFactor * productionVolume;
      }

      breakdown.packaging = packagingImpact;
      totalWaterFootprint += packagingWater * productionVolume;
    }

    // 5. Distribution & Transport
    if (lcaData.distribution) {
      const dist = lcaData.distribution;
      let distributionImpact = 0;

      if (dist.avgDistanceToDcKm && dist.primaryTransportMode) {
        const transportFactor = this.EMISSION_FACTORS[`${dist.primaryTransportMode}_transport`];
        if (transportFactor) {
          // Estimate weight per unit including packaging (0.6 kg average)
          const tonnage = (productionVolume * 0.6) / 1000;
          distributionImpact = tonnage * dist.avgDistanceToDcKm * transportFactor;

          // Palletization efficiency
          if (dist.palletizationEfficiency) {
            distributionImpact = distributionImpact * (100 / dist.palletizationEfficiency);
          }

          // Cold chain additional impact
          if (dist.coldChainRequirement) {
            distributionImpact *= 1.4; // 40% increase for cold chain
          }
        }
      }

      breakdown.distribution = distributionImpact;
    }

    // 6. End of Life
    if (lcaData.endOfLifeDetailed) {
      const eol = lcaData.endOfLifeDetailed;
      let endOfLifeImpact = 0;

      // Assume 0.6 kg total package weight
      const packageWeight = 0.6 * productionVolume;

      if (eol.primaryDisposalMethod && eol.recyclingRatePercentage) {
        const recycledPortion = packageWeight * (eol.recyclingRatePercentage / 100);
        const wastedPortion = packageWeight - recycledPortion;

        // Recycling benefit
        endOfLifeImpact += recycledPortion * this.EMISSION_FACTORS.recycling_benefit;

        // Waste disposal impact
        if (eol.primaryDisposalMethod === 'landfill') {
          endOfLifeImpact += wastedPortion * this.EMISSION_FACTORS.landfill;
        } else if (eol.primaryDisposalMethod === 'incineration') {
          endOfLifeImpact += wastedPortion * this.EMISSION_FACTORS.incineration;
        }

        // Contamination penalty
        if (eol.containerRecyclability?.contaminationRate) {
          const contaminationPenalty = recycledPortion * (eol.containerRecyclability.contaminationRate / 100) * 0.5;
          endOfLifeImpact += contaminationPenalty;
        }
      }

      breakdown.endOfLife = endOfLifeImpact;
    }

    // Calculate total carbon footprint
    const totalCarbonFootprint = Object.values(breakdown).reduce((sum, value) => sum + value, 0);

    // Calculate detailed impact categories (simplified coefficients)
    const detailedImpacts = {
      climateChange: totalCarbonFootprint,
      ozoneDepleteion: totalCarbonFootprint * 0.00001,
      acidification: totalCarbonFootprint * 0.005,
      eutrophication: totalCarbonFootprint * 0.002,
      photochemicalOzoneCreation: totalCarbonFootprint * 0.001,
      waterScarcity: totalWaterFootprint * 0.1,
      landUse: totalLandUse * 100,
      ecotoxicity: totalCarbonFootprint * 0.1,
      humanToxicity: totalCarbonFootprint * 0.00001,
      mineralResourceScarcity: totalCarbonFootprint * 0.0001,
      fossilResourceScarcity: totalCarbonFootprint * 0.3,
    };

    // Data quality assessment
    const dataQuality = this.assessDataQuality(lcaData);
    const uncertaintyPercentage = dataQuality === 'high' ? 15 : dataQuality === 'medium' ? 25 : 40;

    const results: EnhancedLCAResults = {
      totalCarbonFootprint,
      totalWaterFootprint,
      totalLandUse,
      primaryEnergyDemand,
      breakdown,
      detailedImpacts,
      metadata: {
        calculationMethod: 'Enhanced LCA Service v1.0 - ISO 14040/14044 with EU PEF',
        dataQuality,
        uncertaintyPercentage,
        calculationDate: new Date(),
        systemBoundaries: [
          'Agriculture & Raw Materials',
          'Inbound Transport',
          'Processing & Production',
          'Packaging Materials',
          'Distribution & Transport',
          'End-of-Life Treatment'
        ]
      }
    };

    // Phase 3: Auto-sync results to database if enabled
    if (lcaData.productId) {
      try {
        const { LCADataSyncService } = await import('./LCADataSyncService');
        if (LCADataSyncService.isAutoSyncEnabled()) {
          console.log(`🔄 Auto-syncing LCA results for product ${lcaData.productId}...`);
          const totalWasteGenerated = (lcaData.packaging?.bottleWeight || 0) + 
                                    (lcaData.packaging?.labelWeight || 0) + 
                                    (lcaData.packaging?.closureWeight || 0);
          const syncResult = await LCADataSyncService.syncLCAResults(lcaData.productId, {
            totalCarbonFootprint,
            totalWaterFootprint,
            totalWasteGenerated: totalWasteGenerated / 1000, // Convert g to kg
            metadata: results.metadata
          });
          console.log(`${syncResult.success ? '✅' : '❌'} Auto-sync completed for product ${lcaData.productId}`);
        }
      } catch (error) {
        console.warn('⚠️  Auto-sync failed:', error.message);
      }
    }

    return results;
  }

  private static assessDataQuality(lcaData: LCADataInputs): 'high' | 'medium' | 'low' {
    let dataPoints = 0;
    let providedPoints = 0;

    // Count agriculture data points
    if (lcaData.agriculture) {
      dataPoints += 8;
      if (lcaData.agriculture.yieldTonPerHectare) providedPoints++;
      if (lcaData.agriculture.dieselLPerHectare) providedPoints++;
      if (lcaData.agriculture.fertilizer?.nitrogenKgPerHectare) providedPoints++;
      if (lcaData.agriculture.fertilizer?.phosphorusKgPerHectare) providedPoints++;
      if (lcaData.agriculture.landUse?.farmingPractice) providedPoints++;
      if (lcaData.agriculture.sequestrationTonCo2PerTonCrop) providedPoints++;
      if (lcaData.agriculture.landUse?.biodiversityIndex) providedPoints++;
      if (lcaData.agriculture.landUse?.soilQualityIndex) providedPoints++;
    }

    // Count transport data points
    if (lcaData.inboundTransport) {
      dataPoints += 4;
      if (lcaData.inboundTransport.distanceKm) providedPoints++;
      if (lcaData.inboundTransport.mode) providedPoints++;
      if (lcaData.inboundTransport.fuelEfficiencyLper100km) providedPoints++;
      if (lcaData.inboundTransport.loadFactor) providedPoints++;
    }

    // Count processing data points
    if (lcaData.processing) {
      dataPoints += 6;
      if (lcaData.processing.waterM3PerTonCrop) providedPoints++;
      if (lcaData.processing.electricityKwhPerTonCrop) providedPoints++;
      if (lcaData.processing.fermentation?.fermentationTime) providedPoints++;
      if (lcaData.processing.distillation?.distillationRounds) providedPoints++;
      if (lcaData.processing.distillation?.energySourceType) providedPoints++;
      if (lcaData.processing.maturation?.maturationTimeMonths) providedPoints++;
    }

    // Count packaging data points
    if (lcaData.packagingDetailed) {
      dataPoints += 6;
      if (lcaData.packagingDetailed.container?.materialType) providedPoints++;
      if (lcaData.packagingDetailed.container?.weightGrams) providedPoints++;
      if (lcaData.packagingDetailed.label?.materialType) providedPoints++;
      if (lcaData.packagingDetailed.closure?.materialType) providedPoints++;
      if (lcaData.packagingDetailed.container?.recycledContentPercentage) providedPoints++;
      if (lcaData.packagingDetailed.secondaryPackaging?.hasBox) providedPoints++;
    }

    // Count distribution data points
    if (lcaData.distribution) {
      dataPoints += 3;
      if (lcaData.distribution.avgDistanceToDcKm) providedPoints++;
      if (lcaData.distribution.primaryTransportMode) providedPoints++;
      if (lcaData.distribution.palletizationEfficiency) providedPoints++;
    }

    // Count end-of-life data points
    if (lcaData.endOfLifeDetailed) {
      dataPoints += 3;
      if (lcaData.endOfLifeDetailed.recyclingRatePercentage) providedPoints++;
      if (lcaData.endOfLifeDetailed.primaryDisposalMethod) providedPoints++;
      if (lcaData.endOfLifeDetailed.containerRecyclability?.isRecyclable) providedPoints++;
    }

    const completeness = dataPoints > 0 ? (providedPoints / dataPoints) : 0;
    
    if (completeness >= 0.8) return 'high';
    if (completeness >= 0.5) return 'medium';
    return 'low';
  }
}