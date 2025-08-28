import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import SupplierSelectionModal from '@/components/supplier-network/SupplierSelectionModal';
import ProductionTypeSelector from './ProductionTypeSelector';
import { Save, Loader2, Package, Wheat, Box, Factory, Leaf, Award, Truck, Recycle, Plus, Trash2, Search, Building2, CheckCircle, Activity, Calculator } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourButton } from '@/components/tour/TourButton';
import { HelpBubble } from '@/components/ui/help-bubble';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { IngredientSearchSelector } from '@/components/lca/IngredientSearchSelector';
import { PackagingMaterialSelector } from '@/components/lca/PackagingMaterialSelector';
import '@/styles/shepherd.css';

// Enhanced Product Schema with all 8 tabs including LCA Data Collection
const enhancedProductSchema = z.object({
  // Basic Info Tab
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.string().min(1, "Product type is required"),
  volume: z.string().min(1, "Volume is required"),
  description: z.string().optional(),
  productImage: z.string().optional(),
  productImages: z.array(z.string()).default([]),
  isMainProduct: z.boolean().default(false),
  status: z.string().default('active'),
  
  // Ingredients Tab  
  waterDilution: z.object({
    amount: z.coerce.number().min(0, "Water amount must be positive"),
    unit: z.string().min(1, "Unit is required"),
  }).optional(),
  
  ingredients: z.array(z.object({
    name: z.string().min(1, "Ingredient name is required"),
    amount: z.coerce.number().min(0, "Amount must be positive"),
    unit: z.string().min(1, "Unit is required"),
    type: z.string().optional(),
    category: z.string().optional(), // Form category field
    origin: z.string().optional(),
    organic: z.boolean().default(false),
    supplier: z.string().optional(),
    // Manual agriculture fields removed - automated via OpenLCA ecoinvent calculations
    transportDistance: z.coerce.number().optional(),
    processingEnergy: z.coerce.number().optional(),
    waterUsage: z.coerce.number().optional(),
    biodiversityImpact: z.coerce.number().optional(),
    soilQualityIndex: z.coerce.number().optional(),
    carbonSequestration: z.coerce.number().optional(),
  })).optional().default([]),
  
  // Packaging Tab - User-friendly input that auto-syncs to LCA Data
  packaging: z.object({
    primaryContainer: z.object({
      material: z.string().min(1, "Container material is required"),
      weight: z.coerce.number().min(0, "Weight must be positive"),
      recycledContent: z.coerce.number().min(0).max(100).optional(),
      recyclability: z.string().optional(),
      color: z.string().optional(),
      thickness: z.coerce.number().optional(),
      origin: z.string().optional(),
    }),
    labeling: z.object({
      labelMaterial: z.string().optional(),
      labelWeight: z.coerce.number().optional(),
      printingMethod: z.string().optional(),
      inkType: z.string().optional(),
      labelSize: z.coerce.number().optional(),
      origin: z.string().optional(),
    }),
    closure: z.object({
      closureType: z.string().optional(),
      material: z.string().optional(),
      weight: z.coerce.number().optional(),
      hasLiner: z.boolean().default(false),
      linerMaterial: z.string().optional(),
      origin: z.string().optional(),
    }),
    secondaryPackaging: z.object({
      hasSecondaryPackaging: z.boolean().default(false),
      boxMaterial: z.string().optional(),
      boxWeight: z.coerce.number().optional(),
      fillerMaterial: z.string().optional(),
      fillerWeight: z.coerce.number().optional(),
      origin: z.string().optional(),
    }),
    // Additional fields
    packagingNotes: z.string().optional(),
    qualityStandards: z.array(z.string()).optional(),
    supplierInformation: z.object({
      selectedSupplierId: z.string().optional(),
      supplierName: z.string().optional(),
      supplierCategory: z.string().optional(),
      selectedProductId: z.string().optional(),
      selectedProductName: z.string().optional(),
    }).optional(),
  }),
  
  // Production Tab - Enhanced production type selection with branching logic
  production: z.object({
    // New production type selection fields
    productionType: z.enum(['in-house', 'contract-manufacturing', 'hybrid']).optional(),
    facilityId: z.coerce.number().optional(), // For in-house production
    ecoinventProcessId: z.string().optional(), // For contract manufacturing
    stages: z.array(z.object({
      id: z.string(),
      name: z.string().min(1, "Stage name is required"),
      type: z.enum(['in-house', 'outsourced']),
      ecoinventProcessId: z.string().optional(), // For outsourced stages
    })).optional(), // For hybrid production
    
    // Legacy fields maintained for compatibility
    productionModel: z.string().optional(),
    annualProductionVolume: z.coerce.number().min(0, "Production volume must be positive"),
    productionUnit: z.string().default('units'),
    facilityLocation: z.string().optional(),
    facilityAddress: z.string().optional(),
    energySource: z.string().optional(),
    waterSourceType: z.string().optional(),
    heatRecoverySystem: z.boolean().default(false),
    wasteManagement: z.string().optional(),
    circularEconomyFeatures: z.array(z.string()).optional(),
    // Process-specific data for LCA calculations
    processSteps: z.array(z.object({
      stepName: z.string().optional(),
      duration: z.coerce.number().optional(),
      temperature: z.coerce.number().optional(),
      energyIntensity: z.coerce.number().optional(),
      waterConsumption: z.coerce.number().optional(),
      wasteGenerated: z.coerce.number().optional(),
    })).optional(),
    equipmentSpecifications: z.object({
      fermentationVessels: z.coerce.number().optional(),
      distillationColumns: z.coerce.number().optional(),
      agingBarrels: z.coerce.number().optional(),
      bottlingLineCapacity: z.coerce.number().optional(),
      cleaningSystemType: z.string().optional(),
    }).optional(),
    energyConsumption: z.object({
      electricityKwh: z.coerce.number().optional(),
      gasM3: z.coerce.number().optional(),
      steamKg: z.coerce.number().optional(),
      fuelLiters: z.coerce.number().optional(),
      renewableEnergyPercent: z.coerce.number().min(0).max(100).optional(),
      energySource: z.string().optional(),
      heatRecovery: z.boolean().default(false),
    }),
    waterUsage: z.object({
      processWaterLiters: z.coerce.number().optional(),
      cleaningWaterLiters: z.coerce.number().optional(),
      coolingWaterLiters: z.coerce.number().optional(),
      wasteWaterTreatment: z.union([z.string(), z.boolean()]).transform((val) => typeof val === 'boolean' ? (val ? 'yes' : 'no') : val).optional(),
      waterRecyclingPercent: z.coerce.number().min(0).max(100).optional(),
      waterSourceType: z.string().optional(),
    }),
    wasteGeneration: z.object({
      organicWasteKg: z.coerce.number().optional(),
      packagingWasteKg: z.coerce.number().optional(),
      hazardousWasteKg: z.coerce.number().optional(),
      wasteRecycledPercent: z.coerce.number().min(0).max(100).optional(),
      yeastRecovery: z.boolean().default(false),
      grainWasteDestination: z.string().optional(),
    }),
    qualityControl: z.object({
      testingFrequency: z.string().optional(),
      rejectionRate: z.coerce.number().min(0).max(100).optional(),
      reworkRate: z.coerce.number().min(0).max(100).optional(),
      qualityCertifications: z.array(z.string()).optional(),
    }).optional(),
    productionMethods: z.array(z.string()).optional(),
    // Detailed processing sections for auto-sync with LCA Data
    processing: z.object({
      electricityKwhPerTonCrop: z.coerce.number().min(0).default(0),
      lpgKgPerLAlcohol: z.coerce.number().min(0).default(0),
      angelsSharePercentage: z.coerce.number().min(0).max(100).default(0),
      waterM3PerTonCrop: z.coerce.number().min(0).default(0),
      renewableEnergyPercent: z.coerce.number().min(0).max(100).default(0),
    }).optional(),
    fermentation: z.object({
      fermentationTime: z.coerce.number().min(0).default(0),
      yeastType: z.string().default(""),
      temperatureControl: z.boolean().default(false),
      sugarAddedKg: z.coerce.number().min(0).default(0),
    }).optional(),
    distillation: z.object({
      distillationRounds: z.coerce.number().min(0).default(0),
      energySourceType: z.enum(['electric', 'gas', 'biomass', 'steam']).optional(),
      heatRecoverySystem: z.boolean().default(false),
      copperUsageKg: z.coerce.number().min(0).default(0),
    }).optional(),
    maturation: z.object({
      maturationTimeMonths: z.coerce.number().min(0).default(0),
      barrelType: z.enum(['new_oak', 'used_oak', 'stainless_steel', 'concrete', 'ceramic']).optional(),
      barrelOrigin: z.string().default(""),
      barrelReuseCycles: z.coerce.number().min(0).default(0),
    }).optional(),
  }),
  
  // Environmental Impact Tab
  environmentalImpact: z.object({
    calculationMethod: z.string().optional(),
    co2Emissions: z.coerce.number().optional(),
    waterFootprint: z.coerce.number().optional(),
    landUse: z.coerce.number().optional(),
    biodiversityImpact: z.string().optional(),
  }).optional(),
  
  // Certifications & Awards Tab
  certifications: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
  
  // Distribution Tab
  distribution: z.object({
    averageTransportDistance: z.coerce.number().optional(),
    primaryTransportMode: z.string().optional(),
    distributionCenters: z.coerce.number().optional(),
    coldChainRequired: z.boolean().default(false),
    packagingEfficiency: z.coerce.number().optional(),
    palletizationEfficiency: z.coerce.number().optional(),
    temperatureRange: z.string().optional(),
  }),
  
  // End of Life Tab
  endOfLife: z.object({
    returnableContainer: z.boolean().default(false),
    recyclingRate: z.coerce.number().min(0).max(100).optional(),
    disposalMethod: z.string().optional(),
    consumerEducation: z.string().optional(),
    biodegradability: z.object({
      organic: z.boolean().default(false),
      composting: z.boolean().default(false),
      marineBiodegradable: z.boolean().default(false),
    }).optional(),
    lcaEndOfLife: z.object({
      recyclingRate: z.coerce.number().optional(),
      energyRecoveryRate: z.coerce.number().optional(),
      landfillRate: z.coerce.number().optional(),
      transportDistanceKm: z.coerce.number().optional(),
      sortingEfficiency: z.coerce.number().optional(),
    }).optional(),
    takeback: z.object({
      takebackProgram: z.boolean().default(false),
      refillProgram: z.boolean().default(false),
      returnIncentive: z.string().optional(),
    }).optional(),
  }),
  
  // LCA Data Collection Tab - Enhanced granular data collection
  lcaData: z.object({
    // Section 1: Agriculture & Raw Materials - OpenLCA Automated
    agriculture: z.object({
      mainCropType: z.string().optional(), // Only keep main crop type for reference
      // Note: Manual agriculture fields removed - now handled by OpenLCA automation
      biodiversityImpactScore: z.number().optional(), // OpenLCA calculated
      soilQualityIndex: z.number().optional(), // OpenLCA calculated  
      carbonSequestrationRate: z.number().optional(), // OpenLCA calculated
    }),
    
    // Section 2: Inbound Transport
    inboundTransport: z.object({
      distanceKm: z.number().nonnegative().optional(),
      mode: z.enum(['truck', 'rail', 'ship', 'air', 'multimodal']).optional(),
      fuelEfficiencyLper100km: z.number().nonnegative().optional(),
      loadFactor: z.number().min(0).max(100).optional(),
      refrigerationRequired: z.boolean().default(false),
    }).optional(),
    
    // Section 3: Processing & Production
    processing: z.object({
      waterM3PerTonCrop: z.number().nonnegative().optional(),
      electricityKwhPerTonCrop: z.number().nonnegative().optional(),
      lpgKgPerLAlcohol: z.number().nonnegative().optional(),
      netWaterUseLPerBottle: z.number().nonnegative().optional(),
      angelsSharePercentage: z.number().min(0).max(100).optional(),
      renewableEnergyPercent: z.number().min(0).max(100).optional(),
      fermentation: z.object({
        fermentationTime: z.number().nonnegative().optional(), // days
        temperatureControl: z.boolean().default(false),
        yeastType: z.string().optional(),
        sugarAddedKg: z.number().nonnegative().optional(),
      }).optional(),
      distillation: z.object({
        distillationRounds: z.number().nonnegative().optional(),
        energySourceType: z.enum(['electric', 'gas', 'biomass', 'steam']).optional(),
        heatRecoverySystem: z.boolean().default(false),
        copperUsageKg: z.number().nonnegative().optional(),
      }).optional(),
      maturation: z.object({
        maturationTimeMonths: z.number().nonnegative().optional(),
        barrelType: z.enum(['new_oak', 'used_oak', 'stainless_steel', 'concrete', 'ceramic', 'other']).optional(),
        warehouseType: z.enum(['traditional', 'racked', 'climate_controlled']).optional(),
        evaporationLossPercentage: z.number().min(0).max(100).optional(),
      }).optional(),
    }).optional(),
    
    // Section 4: Packaging (Enhanced) - Master Source for All Packaging Data
    packagingDetailed: z.object({
      container: z.object({
        // Core fields (required for LCA calculations)
        materialType: z.enum(['glass', 'plastic', 'aluminum', 'steel', 'ceramic', 'mixed']).optional(),
        weightGrams: z.number().positive().optional(),
        recycledContentPercentage: z.number().min(0).max(100).optional(),
        manufacturingLocation: z.string().optional(),
        transportDistanceKm: z.number().nonnegative().optional(),
        // Additional fields from original packaging tab
        color: z.string().optional(),
        thickness: z.number().optional(),
        recyclability: z.string().optional(),
      }),
      label: z.object({
        materialType: z.enum(['paper', 'plastic', 'foil', 'biodegradable']).optional(),
        weightGrams: z.number().nonnegative().optional(),
        inkType: z.enum(['conventional', 'eco_friendly', 'soy_based', 'solvent_based']).optional(),
        adhesiveType: z.enum(['water_based', 'solvent_based', 'hot_melt']).optional(),
        // Additional fields from original packaging tab
        printingMethod: z.string().optional(),
        labelSize: z.number().optional(),
      }).optional(),
      closure: z.object({
        materialType: z.enum(['cork', 'synthetic_cork', 'screw_cap', 'crown_cap', 'aluminum']).optional(),
        weightGrams: z.number().nonnegative().optional(),
        hasLiner: z.boolean().default(false),
        linerMaterial: z.string().optional(),
      }).optional(),
      secondaryPackaging: z.object({
        hasBox: z.boolean().default(false),
        boxMaterial: z.enum(['cardboard', 'wood', 'plastic', 'metal']).optional(),
        boxWeightGrams: z.number().nonnegative().optional(),
        protectiveMaterial: z.string().optional(),
        protectiveMaterialWeightGrams: z.number().nonnegative().optional(),
        // Additional fields from original packaging tab
        fillerMaterial: z.string().optional(),
        fillerWeight: z.number().optional(),
      }).optional(),
    }),
    
    // Section 5: Distribution & Transport
    distribution: z.object({
      avgDistanceToDcKm: z.number().nonnegative().optional(),
      primaryTransportMode: z.enum(['truck', 'rail', 'ship', 'air']).optional(),
      palletizationEfficiency: z.number().min(0).max(100).optional(),
      coldChainRequirement: z.boolean().default(false),
      temperatureRangeCelsius: z.object({
        min: z.number().optional(),
        max: z.number().optional(),
      }).optional(),
      distributionCenters: z.array(z.object({
        location: z.string(),
        distanceFromProducerKm: z.number().nonnegative(),
        energySource: z.enum(['grid', 'renewable', 'mixed']).optional(),
      })).optional(),
    }).optional(),
    
    // Section 6: End of Life (Enhanced)
    endOfLifeDetailed: z.object({
      recyclingRatePercentage: z.number().min(0).max(100).optional(),
      primaryDisposalMethod: z.enum(['recycling', 'landfill', 'incineration', 'composting']).optional(),
      containerRecyclability: z.object({
        isRecyclable: z.boolean().default(true),
        recyclingInfrastructureAvailable: z.boolean().default(true),
        contaminationRate: z.number().min(0).max(100).optional(),
      }).optional(),
      labelRemovalRequired: z.boolean().default(false),
      consumerEducationProgram: z.boolean().default(false),
      takeback_program: z.boolean().default(false),
    }),
  }).optional(),
});

type EnhancedProductFormData = z.infer<typeof enhancedProductSchema>;

// Data transformation utility to convert database strings to proper types
const transformDatabaseData = (data: any): any => {
  if (!data) return data;
  
  const toNum = (val: any) => {
    if (val === null || val === undefined || val === '') return undefined;
    return typeof val === 'string' ? parseFloat(val) : val;
  };
  
  const toBool = (val: any) => {
    if (val === null || val === undefined) return false;
    if (typeof val === 'string') return val === 'true' || val === '1';
    return Boolean(val);
  };

  // Create a deep copy to avoid mutating the original data
  const transformed = JSON.parse(JSON.stringify(data));

  // Transform packaging data and map from database fields
  if (transformed.packaging) {
    const pkg = transformed.packaging;
    if (pkg.primaryContainer) {
      pkg.primaryContainer.weight = toNum(pkg.primaryContainer.weight);
      pkg.primaryContainer.recycledContent = toNum(pkg.primaryContainer.recycledContent);
      pkg.primaryContainer.thickness = toNum(pkg.primaryContainer.thickness);
    }
    if (pkg.labeling) {
      pkg.labeling.labelWeight = toNum(pkg.labeling.labelWeight);
      pkg.labeling.labelSize = toNum(pkg.labeling.labelSize);
    }
    if (pkg.closure) {
      pkg.closure.weight = toNum(pkg.closure.weight);
      pkg.closure.hasLiner = toBool(pkg.closure.hasLiner);
    }
    if (pkg.secondaryPackaging) {
      pkg.secondaryPackaging.boxWeight = toNum(pkg.secondaryPackaging.boxWeight);
      pkg.secondaryPackaging.fillerWeight = toNum(pkg.secondaryPackaging.fillerWeight);
      pkg.secondaryPackaging.hasSecondaryPackaging = toBool(pkg.secondaryPackaging.hasSecondaryPackaging);
    }
  }
  
  // Map database fields to form fields for missing auto-fill data
  if (transformed.closureMaterial && !transformed.packaging?.closure?.material) {
    if (!transformed.packaging) transformed.packaging = {};
    if (!transformed.packaging.closure) transformed.packaging.closure = {};
    transformed.packaging.closure.material = transformed.closureMaterial;
  }
  
  if (transformed.labelInkType && !transformed.packaging?.labeling?.inkType) {
    if (!transformed.packaging) transformed.packaging = {};
    if (!transformed.packaging.labeling) transformed.packaging.labeling = {};
    transformed.packaging.labeling.inkType = transformed.labelInkType;
  }
  
  if (transformed.averageTransportDistance && !transformed.distribution?.averageTransportDistance) {
    if (!transformed.distribution) transformed.distribution = {};
    transformed.distribution.averageTransportDistance = toNum(transformed.averageTransportDistance);
  }
  
  if (transformed.recyclingRate && !transformed.endOfLife?.recyclingRate) {
    if (!transformed.endOfLife) transformed.endOfLife = {};
    transformed.endOfLife.recyclingRate = toNum(transformed.recyclingRate);
  }

  // Transform water dilution
  if (transformed.waterDilution) {
    transformed.waterDilution.amount = toNum(transformed.waterDilution.amount);
  }

  // Transform ingredients with type-to-category mapping
  if (transformed.ingredients && Array.isArray(transformed.ingredients)) {
    // Create mapping from database type to form category
    const typeToCategory: { [key: string]: string } = {
      'sugar_product': 'Sugar Products',
      'grain': 'Grains',
      'fruit': 'Fruits',
      'botanical': 'Botanicals',
      'agave': 'Agave',
      'ethanol': 'Ethanol',
      'additive': 'Additives'
    };

    transformed.ingredients = transformed.ingredients.map((ing: any) => ({
      ...ing,
      amount: toNum(ing.amount),
      // Map database type to form category
      category: ing.type ? typeToCategory[ing.type] || ing.type : undefined,
      yieldPerHectare: toNum(ing.yieldPerHectare),
      nitrogenFertilizer: toNum(ing.nitrogenFertilizer),
      phosphorusFertilizer: toNum(ing.phosphorusFertilizer),
      dieselUsage: toNum(ing.dieselUsage),
      transportDistance: toNum(ing.transportDistance),
      processingEnergy: toNum(ing.processingEnergy),
      waterUsage: toNum(ing.waterUsage),
      biodiversityImpact: toNum(ing.biodiversityImpact),
      soilQualityIndex: toNum(ing.soilQualityIndex),
      carbonSequestration: toNum(ing.carbonSequestration),
    }));
  }

  // Transform distribution data
  if (transformed.distribution) {
    transformed.distribution.averageTransportDistance = toNum(transformed.distribution.averageTransportDistance);
    transformed.distribution.distributionCenters = toNum(transformed.distribution.distributionCenters);
    transformed.distribution.packagingEfficiency = toNum(transformed.distribution.packagingEfficiency);
    transformed.distribution.palletizationEfficiency = toNum(transformed.distribution.palletizationEfficiency);
    transformed.distribution.coldChainRequired = toBool(transformed.distribution.coldChainRequired);
  }

  // Transform end of life data
  if (transformed.endOfLife) {
    transformed.endOfLife.recyclingRate = toNum(transformed.endOfLife.recyclingRate);
    transformed.endOfLife.returnableContainer = toBool(transformed.endOfLife.returnableContainer);
  }

  // Transform production data
  if (transformed.production) {
    transformed.production.annualProductionVolume = toNum(transformed.production.annualProductionVolume);
    transformed.production.heatRecoverySystem = toBool(transformed.production.heatRecoverySystem);
  }

  return transformed;
};

interface EnhancedProductFormProps {
  initialData?: Partial<EnhancedProductFormData>;
  onSubmit: (data: EnhancedProductFormData) => void;
  onSaveDraft?: (data: EnhancedProductFormData) => void;
  isEditing?: boolean;
  isSubmitting?: boolean;
  isDraftSaving?: boolean;
  productId?: string | number;
}

export default function EnhancedProductForm({ 
  initialData, 
  onSubmit, 
  onSaveDraft,
  isEditing = false, 
  isSubmitting = false,
  isDraftSaving = false,
  productId
}: EnhancedProductFormProps) {
  const [activeTab, setActiveTab] = useState('basic');
  const [selectedIngredientSuppliers, setSelectedIngredientSuppliers] = useState<any[]>([]);
  const [selectedPackagingSupplier, setSelectedPackagingSupplier] = useState<any>(null);
  const [selectedProductionSupplier, setSelectedProductionSupplier] = useState<any>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [openLCAIngredients, setOpenLCAIngredients] = useState<IngredientInput[]>([]);
  
  // LCA calculation state
  const [lcaJobId, setLcaJobId] = useState<string | null>(null);

  // Ingredient selection now uses unified OpenLCA database search
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EnhancedProductFormData>({
    resolver: zodResolver(enhancedProductSchema),
    defaultValues: {
      name: '',
      sku: '',
      type: '',
      volume: '',
      description: '',
      productImage: '',
      productImages: [],
      isMainProduct: false,
      status: 'active',
      waterDilution: { amount: 0, unit: 'ml' },
      ingredients: [{ 
        name: '', amount: 0, unit: 'ml', type: '', category: '', origin: '', organic: false, supplier: '',
        transportDistance: 0, processingEnergy: 0, waterUsage: 0
      }],
      packaging: {
        primaryContainer: { material: '', weight: 0, recycledContent: 0, recyclability: '', color: '', thickness: 0, origin: '' },
        labeling: { labelMaterial: '', labelWeight: 0, printingMethod: '', inkType: '', labelSize: 0, origin: '' },
        closure: { closureType: '', material: '', weight: 0, hasLiner: false, linerMaterial: '', origin: '' },
        secondaryPackaging: { hasSecondaryPackaging: false, boxMaterial: '', boxWeight: 0, fillerMaterial: '', fillerWeight: 0, origin: '' },
        packagingNotes: '',
        qualityStandards: [],
        supplierInformation: {
          selectedSupplierId: '',
          supplierName: '',
          supplierCategory: '',
        },
      },
      production: {
        // New production type selection fields
        productionType: undefined,
        facilityId: undefined,
        ecoinventProcessId: undefined,
        stages: undefined,
        
        // Legacy fields maintained for compatibility
        productionModel: '',
        annualProductionVolume: 0,
        productionUnit: 'units',
        facilityLocation: '',
        facilityAddress: '',
        energyConsumption: { electricityKwh: 0, gasM3: 0, steamKg: 0, fuelLiters: 0, renewableEnergyPercent: 0 },
        waterUsage: { processWaterLiters: 0, cleaningWaterLiters: 0, coolingWaterLiters: 0, wasteWaterTreatment: '' },
        wasteGeneration: { organicWasteKg: 0, packagingWasteKg: 0, hazardousWasteKg: 0, wasteRecycledPercent: 0 },
        productionMethods: [],
        processing: {
          electricityKwhPerTonCrop: 0,
          lpgKgPerLAlcohol: 0,
          angelsSharePercentage: 0,
          waterM3PerTonCrop: 0,
          renewableEnergyPercent: 0,
          fermentation: {
            fermentationTime: 7,
            yeastType: 'commercial',
            temperatureControl: false,
            sugarAddedKg: 0,
          },
          distillation: {
            distillationRounds: 2,
            energySourceType: 'gas',
            heatRecoverySystem: false,
            copperUsageKg: 0,
          },
          maturation: {
            maturationTimeMonths: 12,
            barrelType: 'used_oak',
            warehouseType: 'traditional',
            evaporationLossPercentage: 2,
          },
        },
      },
      environmentalImpact: { calculationMethod: 'estimated', co2Emissions: 0, waterFootprint: 0, landUse: 0, biodiversityImpact: 'low' },
      certifications: [],
      awards: [],
      distribution: { averageTransportDistance: 0, primaryTransportMode: '', distributionCenters: 0, coldChainRequired: false, packagingEfficiency: 0 },
      endOfLife: { returnableContainer: false, recyclingRate: 0, disposalMethod: '', consumerEducation: '' },
      lcaData: {
        agriculture: {
          mainCropType: '', // Only main crop type kept for reference
          // Manual agriculture fields removed - handled by OpenLCA automation
        },
        inboundTransport: { distanceKm: 0, mode: undefined, fuelEfficiencyLper100km: 0, loadFactor: 0, refrigerationRequired: false },
        processing: {
          waterM3PerTonCrop: 0,
          electricityKwhPerTonCrop: 0,
          lpgKgPerLAlcohol: 0,
          netWaterUseLPerBottle: 0,
          angelsSharePercentage: 0,
          renewableEnergyPercent: 0,
          fermentation: { fermentationTime: 0, temperatureControl: false, yeastType: '', sugarAddedKg: 0 },
          distillation: { distillationRounds: 0, energySourceType: undefined, heatRecoverySystem: false, copperUsageKg: 0 },
          maturation: { maturationTimeMonths: 0, barrelType: undefined, warehouseType: undefined, evaporationLossPercentage: 0 },
        },
        packagingDetailed: {
          container: { 
            materialType: undefined, 
            weightGrams: 0, 
            recycledContentPercentage: 0, 
            manufacturingLocation: '', 
            transportDistanceKm: 0,
            color: '',
            thickness: 0,
            recyclability: '',
          },
          label: { 
            materialType: undefined, 
            weightGrams: 0, 
            inkType: undefined, 
            adhesiveType: undefined,
            printingMethod: '',
            labelSize: 0,
          },
          closure: { 
            materialType: undefined, 
            weightGrams: 0, 
            hasLiner: false, 
            linerMaterial: '',
          },
          secondaryPackaging: { 
            hasBox: false, 
            boxMaterial: undefined, 
            boxWeightGrams: 0, 
            protectiveMaterial: '', 
            protectiveMaterialWeightGrams: 0,
            fillerMaterial: '',
            fillerWeight: 0,
          },
        },
        distribution: { 
          avgDistanceToDcKm: 0, 
          primaryTransportMode: undefined, 
          palletizationEfficiency: 0, 
          coldChainRequirement: false,
          temperatureRangeCelsius: { min: 0, max: 0 },
          distributionCenters: [],
        },
        endOfLifeDetailed: {
          recyclingRatePercentage: 0,
          primaryDisposalMethod: undefined,
          containerRecyclability: { isRecyclable: true, recyclingInfrastructureAvailable: true, contaminationRate: 0 },
          labelRemovalRequired: false,
          consumerEducationProgram: false,
          takeback_program: false,
        },
      },
    },
  });

  // Reset form when initialData changes (critical for edit mode)
  useEffect(() => {
    if (initialData) {
      console.log('🔄 Resetting form with initialData:', initialData);
      
      // Transform database data to proper types before resetting form
      const transformedData = transformDatabaseData(initialData);
      console.log('🔄 Transformed data:', transformedData);
      
      form.reset(transformedData);
      
      // Force update specific nested fields with null checks
      if (transformedData.waterDilution?.amount !== undefined) {
        setTimeout(() => {
          form.setValue('waterDilution.amount', transformedData.waterDilution.amount);
          form.setValue('waterDilution.unit', transformedData.waterDilution.unit);
        }, 100);
      }
      
      // Force update packaging data with null checks and missing fields
      if (transformedData.packaging) {
        setTimeout(() => {
          // Set closure data with null checks
          if (transformedData.packaging.closure?.closureType) {
            form.setValue('packaging.closure.closureType', transformedData.packaging.closure.closureType);
          }
          if (transformedData.packaging.closure?.material) {
            form.setValue('packaging.closure.material', transformedData.packaging.closure.material);
          }
          if (transformedData.packaging.closure?.weight !== undefined) {
            form.setValue('packaging.closure.weight', transformedData.packaging.closure.weight);
          }
          
          // Set labeling data with null checks including missing inkType
          if (transformedData.packaging.labeling?.labelMaterial) {
            form.setValue('packaging.labeling.labelMaterial', transformedData.packaging.labeling.labelMaterial);
          }
          if (transformedData.packaging.labeling?.labelWeight !== undefined) {
            form.setValue('packaging.labeling.labelWeight', transformedData.packaging.labeling.labelWeight);
          }
          if (transformedData.packaging.labeling?.inkType) {
            form.setValue('packaging.labeling.inkType', transformedData.packaging.labeling.inkType);
          }
          if (transformedData.packaging.labeling?.printingMethod) {
            form.setValue('packaging.labeling.printingMethod', transformedData.packaging.labeling.printingMethod);
          }
          
          // Set secondary packaging data with null checks
          if (transformedData.packaging.secondaryPackaging?.hasSecondaryPackaging !== undefined) {
            form.setValue('packaging.secondaryPackaging.hasSecondaryPackaging', transformedData.packaging.secondaryPackaging.hasSecondaryPackaging);
          }
          if (transformedData.packaging.secondaryPackaging?.boxMaterial) {
            form.setValue('packaging.secondaryPackaging.boxMaterial', transformedData.packaging.secondaryPackaging.boxMaterial);
          }
          if (transformedData.packaging.secondaryPackaging?.boxWeight !== undefined) {
            form.setValue('packaging.secondaryPackaging.boxWeight', transformedData.packaging.secondaryPackaging.boxWeight);
          }
        }, 200);
      }
      
      // Set distribution data
      if (transformedData.distribution) {
        setTimeout(() => {
          if (transformedData.distribution.averageTransportDistance !== undefined) {
            form.setValue('distribution.averageTransportDistance', transformedData.distribution.averageTransportDistance);
          }
        }, 300);
      }
      
      // Set end of life data
      if (transformedData.endOfLife) {
        setTimeout(() => {
          if (transformedData.endOfLife.recyclingRate !== undefined) {
            form.setValue('endOfLife.recyclingRate', transformedData.endOfLife.recyclingRate);
          }
        }, 400);
      }
      
      // Also set product images if they exist
      if (transformedData.productImages && Array.isArray(transformedData.productImages)) {
        setProductImages(transformedData.productImages);
      }

      // Initialize selectedIngredientCategories from transformed ingredient data
      // Ingredient categories are now handled by individual search selectors
    }
  }, [initialData, form]);

  // Initialize selectedPackagingSupplier from existing data
  useEffect(() => {
    console.log('🔍 useEffect triggered with initialData:', {
      initialData: initialData?.packaging?.supplierInformation,
      selectedPackagingSupplier,
      hasSupplierInfo: !!initialData?.packaging?.supplierInformation?.selectedSupplierId
    });
    
    if (initialData?.packaging?.supplierInformation?.selectedProductId && !selectedPackagingSupplier) {
      // Create a supplier object from the saved data
      const savedSupplier = {
        id: initialData.packaging.supplierInformation.selectedProductId,
        supplierId: initialData.packaging.supplierInformation.selectedSupplierId,
        productName: initialData.packaging.supplierInformation.selectedProductName || 'Selected Product',
        supplierName: initialData.packaging.supplierInformation.supplierName || 'Unknown Supplier',
        supplierCategory: initialData.packaging.supplierInformation.supplierCategory || 'bottle_producer',
      };
      console.log('🔄 Loading saved packaging supplier and product:', savedSupplier);
      setSelectedPackagingSupplier(savedSupplier);
    }
  }, [initialData?.packaging?.supplierInformation?.selectedProductId, selectedPackagingSupplier]);

  const handleSubmit = (data: EnhancedProductFormData) => {
    console.log('🎯 EnhancedProductForm handleSubmit called');
    console.log('📋 Form data:', data);
    console.log('🖼️ Product images:', productImages);
    
    // Convert form data back to database format
    const preparedData = { ...data };
    
    // Map category back to type for database storage
    if (preparedData.ingredients && Array.isArray(preparedData.ingredients)) {
      const categoryToType: { [key: string]: string } = {
        'Sugar Products': 'sugar_product',
        'Grains': 'grain',
        'Fruits': 'fruit',
        'Botanicals': 'botanical',
        'Agave': 'agave',
        'Ethanol': 'ethanol',
        'Additives': 'additive'
      };

      preparedData.ingredients = preparedData.ingredients.map((ing: any) => ({
        ...ing,
        // Map form category back to database type
        type: ing.category ? categoryToType[ing.category] || ing.category : ing.type
      }));
    }
    
    const submissionData = {
      ...preparedData,
      productImages
    };
    console.log('📤 Final submission data:', submissionData);
    console.log('📤 Ingredients being submitted:', submissionData.ingredients);
    onSubmit(submissionData);
  };

  const handleSaveDraft = () => {
    const currentData = form.getValues();
    onSaveDraft?.(currentData);
  };

  // LCA calculation mutations
  const startLcaCalculation = useMutation({
    mutationFn: async () => {
      if (!productId) {
        throw new Error('Product ID is required for LCA calculation');
      }
      
      const response = await apiRequest('POST', `/api/lca/calculate/${productId}`, {
        options: {
          includeTransport: true,
          includeProcessing: true,
          allocationMethod: 'economic'
        }
      });
      return await response.json();
    },
    onSuccess: (data) => {
      setLcaJobId(data.jobId);
      
      toast({
        title: "LCA Calculation Started",
        description: `Estimated completion time: ${Math.round(data.estimatedDuration / 1000)} seconds`,
      });
      
      // Start polling for status updates
      pollLcaStatus(data.jobId);
    },
    onError: (error: any) => {
      toast({
        title: "LCA Calculation Failed",
        description: error.message || "Unable to start LCA calculation",
        variant: "destructive",
      });
    }
  });

  // Poll LCA calculation status
  const pollLcaStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await apiRequest('GET', `/api/lca/calculation/${jobId}`);
        const status = await response.json();
        
        if (status.status === 'completed') {
          clearInterval(pollInterval);
          
          toast({
            title: "LCA Calculation Complete!",
            description: "Environmental impact assessment has been generated successfully.",
          });
          
          // Invalidate product queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          
          toast({
            title: "LCA Calculation Failed",
            description: status.errorMessage || "Calculation encountered an error",
            variant: "destructive",
          });
        }
        
      } catch (error) {
        console.error('Error polling LCA status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      toast({
        title: "LCA Calculation Timeout",
        description: "Calculation took longer than expected",
        variant: "destructive",
      });
    }, 300000);
  };

  const handleCalculateLCA = () => {
    if (!productId) {
      toast({
        title: "Save Product First",
        description: "Please save the product before calculating LCA",
        variant: "destructive",
      });
      return;
    }
    
    if (!isEditing) {
      toast({
        title: "Product Not Saved",
        description: "Please save the product before calculating LCA",
        variant: "destructive",
      });
      return;
    }
    
    startLcaCalculation.mutate();
  };

  // Auto-fill LCA Data from all tabs when moving to LCA Data Collection tab
  useEffect(() => {
    if (activeTab === 'lcadata') {
      const currentData = form.getValues();
      
      // 1. Auto-fill Main Crop Type from Ingredients tab
      if (currentData.ingredients && currentData.ingredients.length > 0) {
        const primaryIngredient = currentData.ingredients[0];
        if (primaryIngredient?.name && !currentData.lcaData?.agriculture?.mainCropType) {
          form.setValue('lcaData.agriculture.mainCropType', primaryIngredient.name);
        }
        
        // Note: Agricultural data is now handled by OpenLCA automation instead of manual sync
        if (primaryIngredient?.transportDistance) {
          form.setValue('lcaData.inboundTransport.distanceKm', primaryIngredient.transportDistance);
        }
        if (primaryIngredient?.waterUsage) {
          form.setValue('lcaData.processing.waterM3PerTonCrop', primaryIngredient.waterUsage);
        }
      }
      
      // 2. Auto-fill Packaging data (Material fix for Frugal Bottle)
      if (currentData.packaging?.primaryContainer) {
        const container = currentData.packaging.primaryContainer;
        if (container.material && !currentData.lcaData?.packagingDetailed?.container?.materialType) {
          // Fix for Frugal Bottle "Mixed" material
          let materialType = container.material.toLowerCase();
          if (materialType === 'mixed') {
            materialType = 'glass'; // Default mixed material to glass for LCA calculations
          }
          form.setValue('lcaData.packagingDetailed.container.materialType', materialType as any);
        }
        if (container.weight) {
          form.setValue('lcaData.packagingDetailed.container.weightGrams', container.weight);
        }
        if (container.recycledContent) {
          form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', container.recycledContent);
        }
      }
      
      // Auto-fill label specifications
      if (currentData.packaging?.labeling) {
        const label = currentData.packaging.labeling;
        if (label.labelMaterial) {
          form.setValue('lcaData.packagingDetailed.label.materialType', label.labelMaterial);
        }
        if (label.labelWeight) {
          form.setValue('lcaData.packagingDetailed.label.weightGrams', label.labelWeight);
        }
      }
      
      // Auto-fill closure system
      if (currentData.packaging?.closure) {
        const closure = currentData.packaging.closure;
        if (closure.material) {
          form.setValue('lcaData.packagingDetailed.closure.materialType', closure.material);
        }
        if (closure.weight) {
          form.setValue('lcaData.packagingDetailed.closure.weightGrams', closure.weight);
        }
      }
      
      // Auto-fill secondary packaging
      if (currentData.packaging?.secondaryPackaging) {
        const secondary = currentData.packaging.secondaryPackaging;
        if (secondary.hasSecondaryPackaging && secondary.boxMaterial) {
          form.setValue('lcaData.packagingDetailed.secondaryPackaging.hasBox', true);
          form.setValue('lcaData.packagingDetailed.secondaryPackaging.boxMaterial', secondary.boxMaterial);
        }
        if (secondary.boxWeight) {
          form.setValue('lcaData.packagingDetailed.secondaryPackaging.boxWeightGrams', secondary.boxWeight);
        }
      }
      
      // 3. Auto-fill Production data
      if (currentData.production) {
        const production = currentData.production;
        
        // Barrel Type and Maturation
        if (production.maturation?.barrelType) {
          form.setValue('lcaData.processing.maturation.barrelType', production.maturation.barrelType);
        }
        if (production.maturation?.maturationTimeMonths) {
          form.setValue('lcaData.processing.maturation.maturationTimeMonths', production.maturation.maturationTimeMonths);
        }
        
        // Angels Share (Evaporation Loss)
        if (production.processing?.angelsSharePercentage) {
          form.setValue('lcaData.processing.maturation.evaporationLossPercent', production.processing.angelsSharePercentage);
        }
        
        // Energy consumption
        if (production.processing?.electricityKwhPerTonCrop) {
          form.setValue('lcaData.processing.electricityKwhPerTonCrop', production.processing.electricityKwhPerTonCrop);
        }
        if (production.processing?.renewableEnergyPercent) {
          form.setValue('lcaData.processing.renewableEnergyPercent', production.processing.renewableEnergyPercent);
        }
        
        // Water usage
        if (production.processing?.waterM3PerTonCrop) {
          form.setValue('lcaData.processing.waterM3PerTonCrop', production.processing.waterM3PerTonCrop);
        }
        
        // Distillation data
        if (production.distillation?.distillationRounds) {
          form.setValue('lcaData.processing.distillation.distillationRounds', production.distillation.distillationRounds);
        }
        if (production.distillation?.energySourceType) {
          form.setValue('lcaData.processing.distillation.energySourceType', production.distillation.energySourceType);
        }
        if (production.distillation?.heatRecoverySystem) {
          form.setValue('lcaData.processing.distillation.heatRecoverySystem', production.distillation.heatRecoverySystem);
        }
        if (production.distillation?.copperUsageKg) {
          form.setValue('lcaData.processing.distillation.copperUsageKg', production.distillation.copperUsageKg);
        }
        
        // Fermentation data
        if (production.fermentation?.fermentationTime) {
          form.setValue('lcaData.processing.fermentation.fermentationTime', production.fermentation.fermentationTime);
        }
      }
      
      // 4. Auto-fill Distribution data
      if (currentData.distribution) {
        const distribution = currentData.distribution;
        if (distribution.averageTransportDistance) {
          form.setValue('lcaData.distribution.avgDistanceToDcKm', distribution.averageTransportDistance);
        }
        if (distribution.primaryTransportMode) {
          form.setValue('lcaData.distribution.primaryTransportMode', distribution.primaryTransportMode as any);
        }
        if (distribution.palletizationEfficiency) {
          form.setValue('lcaData.distribution.palletizationEfficiency', distribution.palletizationEfficiency);
        }
      }
      
      // 5. Auto-fill End of Life data
      if (currentData.endOfLife) {
        const endOfLife = currentData.endOfLife;
        if (endOfLife.recyclingRate) {
          form.setValue('lcaData.endOfLifeDetailed.recyclingRatePercentage', endOfLife.recyclingRate);
        }
        if (endOfLife.disposalMethod) {
          form.setValue('lcaData.endOfLifeDetailed.primaryDisposalMethod', endOfLife.disposalMethod as any);
        }
        if (endOfLife.returnableContainer !== undefined) {
          form.setValue('lcaData.endOfLifeDetailed.containerRecyclability.isRecyclable', endOfLife.returnableContainer);
        }
      }
    }
  }, [activeTab, form]);

  return (
    <TourProvider>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="w-full" onKeyDown={(e) => {
          // Prevent form submission on Enter key unless we're on the last tab
          if (e.key === 'Enter' && activeTab !== 'lcadata') {
            e.preventDefault();
          }
        }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs">Ingredients</TabsTrigger>
            <TabsTrigger value="packaging" className="text-xs">Packaging</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
            <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
            <TabsTrigger value="endoflife" className="text-xs">End of Life</TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-avallen-green" />
                  Basic Product Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Avallen Calvados" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU Code *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., AVALLEN-CALVADOS-750ML" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select product type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="spirits">Spirits</SelectItem>
                            <SelectItem value="wine">Wine</SelectItem>
                            <SelectItem value="beer">Beer</SelectItem>
                            <SelectItem value="liqueur">Liqueur</SelectItem>
                            <SelectItem value="cider">Cider</SelectItem>
                            <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="volume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volume *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 750ml" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your product..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Product Images Upload */}
                <div className="space-y-4">
                  <FormLabel>Product Images (Pack Shots)</FormLabel>
                  <p className="text-sm text-gray-600">Upload up to 5 product images. Maximum 10MB each.</p>
                  
                  <ImageUploader
                    maxImages={5}
                    existingImages={productImages}
                    onUpload={(uploadedUrls) => {
                      const newImages = [...productImages, ...uploadedUrls].slice(0, 5);
                      setProductImages(newImages);
                      form.setValue('productImages', newImages);
                    }}
                    onComplete={(objectPath) => {
                      // Object path is already handled by onUpload
                      console.log('Image upload complete:', objectPath);
                    }}
                    placeholder={`Upload Product Images (${productImages.length}/5)`}
                  >
                    Upload Product Images ({productImages.length}/5)
                  </ImageUploader>

                  {/* Display uploaded images with delete option */}
                  {productImages.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      {productImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl.startsWith('/objects/') ? imageUrl : `/objects/${imageUrl.split('/uploads/')[1]}`}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => {
                              const newImages = productImages.filter((_, i) => i !== index);
                              setProductImages(newImages);
                              form.setValue('productImages', newImages);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="isMainProduct"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Mark as main product</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          This will be your primary product for reporting
                        </p>
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ingredients Tab - Updated with OpenLCA Integration */}
          <TabsContent value="ingredients" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-avallen-green" />
                  Recipe & Ingredients
                </CardTitle>
                <div className="text-sm text-muted-foreground">
                  Select ingredients from our OpenLCA database for automated environmental impact calculations
                </div>
              </CardHeader>
              <CardContent>
                {/* OpenLCA Ingredient Selector */}
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🌱 Automated Environmental Data</h4>
                    <p className="text-sm text-green-700">
                      Ingredients selected below will automatically use OpenLCA ecoinvent database for scientifically validated environmental impact calculations including water footprint, carbon emissions, and land use.
                    </p>
                  </div>
                  
                  {/* OpenLCA Ingredient Entry Form */}
                  <div className="space-y-4">
                    {form.watch('ingredients').map((ingredient, index) => (
                      <Card key={index} className="border-green-200 bg-green-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <Wheat className="w-4 h-4 text-green-600" />
                              Ingredient {index + 1}
                            </span>
                            {form.watch('ingredients').length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const currentIngredients = form.getValues('ingredients');
                                  form.setValue('ingredients', currentIngredients.filter((_, i) => i !== index));
                                }}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            )}
                          </CardTitle>
                          <p className="text-xs text-green-600">
                            Environmental data automatically calculated via OpenLCA ecoinvent database
                          </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Unified Ingredient Search */}
                          <IngredientSearchSelector 
                            form={form}
                            index={index}
                          />

                          {/* Amount and Unit - Side by Side */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.amount`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Amount *</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.001"
                                      placeholder="e.g., 3.5"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Quantity used per product unit
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.unit`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit *</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select unit" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                      <SelectItem value="l">Liters (l)</SelectItem>
                                      <SelectItem value="ml">Milliliters (ml)</SelectItem>
                                      <SelectItem value="g">Grams (g)</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.origin`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Origin Country</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="e.g., Mauritius, France"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Country or region of origin
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name={`ingredients.${index}.organic`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                  <FormLabel>Organic certified</FormLabel>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="flex justify-between items-center pt-2">
                            <SupplierSelectionModal
                              inputType="ingredient"
                              onSelect={(supplier) => {
                                // Auto-fill this specific ingredient with supplier data
                                const productAttrs = supplier.productAttributes || {};
                                form.setValue(`ingredients.${index}.name`, supplier.productName || '');
                                form.setValue(`ingredients.${index}.origin`, productAttrs.origin_country || '');
                                form.setValue(`ingredients.${index}.supplier`, supplier.supplierName || '');
                                form.setValue(`ingredients.${index}.organic`, productAttrs.organic_certified || false);
                                if (productAttrs.typical_usage_per_unit) {
                                  form.setValue(`ingredients.${index}.amount`, productAttrs.typical_usage_per_unit);
                                }
                              }}
                              onManualEntry={() => {}}
                              selectedProduct={null}
                            >
                              <Button type="button" variant="ghost" size="sm">
                                <Search className="w-3 h-3 mr-1" />
                                Select from Suppliers
                              </Button>
                            </SupplierSelectionModal>

                            <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              OpenLCA + Supplier Data
                            </div>
                          </div>

                          <div className="bg-green-50 p-3 rounded border border-green-200">
                            <p className="text-xs text-green-700">
                              <strong>ISO-Compliant OpenLCA Integration:</strong> Environmental impact calculations (carbon footprint, water usage, land use, biodiversity) are now fully automated using the ecoinvent LCI database. Manual agriculture data entry has been replaced with scientifically validated calculations.
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Add Ingredient Button */}
                    {form.watch('ingredients').length < 10 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const currentIngredients = form.getValues('ingredients');
                          form.setValue('ingredients', [
                            ...currentIngredients,
                            {
                              name: '',
                              amount: 0,
                              unit: 'kg',
                              type: 'agricultural',
                              origin: '',
                              organic: false,
                              supplier: '',
                              transportDistance: 0,
                              processingEnergy: 0,
                              waterUsage: 0
                            }
                          ]);
                        }}
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Ingredient ({form.watch('ingredients').length}/10)
                      </Button>
                    )}

                    {/* Water Dilution Section - Restored */}
                    <Card className="border-blue-200 bg-blue-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          Water Dilution
                        </CardTitle>
                        <p className="text-xs text-blue-600">
                          Water used to dilute from distillation/barrel strength to bottling strength
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="waterDilution.amount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Water Amount *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="number" 
                                    step="0.1"
                                    placeholder="e.g., 250" 
                                    {...field}
                                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Volume of water added per bottle
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="waterDilution.unit"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Unit *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select unit" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="ml">Milliliters per bottle</SelectItem>
                                    <SelectItem value="l">Liters per bottle</SelectItem>
                                    <SelectItem value="l_per_100l">Liters per 100L product</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>


              </CardContent>
            </Card>
          </TabsContent>



          {/* Packaging Tab */}
          <TabsContent value="packaging" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-avallen-green" />
                  Packaging Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Selection for Packaging */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Select from Verified Packaging Suppliers
                  </h4>
                  
                  {selectedPackagingSupplier ? (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800">{selectedPackagingSupplier.supplierName}</h4>
                            <p className="text-sm text-green-600">{selectedPackagingSupplier.productName}</p>
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              Selected Packaging
                            </Badge>
                          </div>
                          <SupplierSelectionModal
                            inputType="bottle"
                            onSelect={(supplier) => {
                              setSelectedPackagingSupplier(supplier);
                              // Auto-fill packaging data from supplier product (user-friendly fields + auto-sync to LCA)
                              const productAttrs = supplier.productAttributes || {};
                              const lcaData = supplier.lcaDataJson || {};
                              const supplierAddr = supplier.supplierAddress || {};
                              const origin = `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '';
                              
                              // Update user-friendly packaging tab fields
                              form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                              form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                              form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                              form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                              form.setValue('packaging.primaryContainer.origin', origin);
                              if (productAttrs.thickness) {
                                form.setValue('packaging.primaryContainer.thickness', productAttrs.thickness);
                              }
                              if (productAttrs.recyclability) {
                                form.setValue('packaging.primaryContainer.recyclability', productAttrs.recyclability);
                              }
                              
                              // Update supplier information
                              form.setValue('packaging.supplierInformation.selectedSupplierId', supplier.supplierId);
                              form.setValue('packaging.supplierInformation.supplierName', supplier.supplierName);
                              form.setValue('packaging.supplierInformation.supplierCategory', supplier.supplierCategory);
                              form.setValue('packaging.supplierInformation.selectedProductId', supplier.id);
                              form.setValue('packaging.supplierInformation.selectedProductName', supplier.productName);
                              
                              // Auto-sync to LCA Data (for calculations)
                              form.setValue('lcaData.packagingDetailed.container.materialType', productAttrs.material?.toLowerCase() as any);
                              form.setValue('lcaData.packagingDetailed.container.weightGrams', productAttrs.weight || productAttrs.weight_grams || 0);
                              form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                              form.setValue('lcaData.packagingDetailed.container.color', productAttrs.color || '');
                              form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', origin);
                              if (productAttrs.thickness) {
                                form.setValue('lcaData.packagingDetailed.container.thickness', productAttrs.thickness);
                              }
                              if (productAttrs.recyclability) {
                                form.setValue('lcaData.packagingDetailed.container.recyclability', productAttrs.recyclability);
                              }
                              
                              // Supplier CO2 emissions data override (converted from grams to kg for calculation)
                              if (productAttrs.co2Emissions) {
                                const supplierCo2Kg = productAttrs.co2Emissions / 1000; // Convert grams to kg
                                form.setValue('environmentalImpact.co2Emissions', supplierCo2Kg);
                                
                                // Also update LCA data to reflect supplier-provided emissions
                                form.setValue('lcaData.packagingDetailed.container.co2EmissionsKg', supplierCo2Kg);
                                form.setValue('lcaData.packagingDetailed.container.hasSupplierLcaData', true);
                              }
                            }}
                            onManualEntry={() => {
                              setSelectedPackagingSupplier(null);
                            }}
                            selectedProduct={selectedPackagingSupplier}
                          >
                            <Button type="button" variant="outline" size="sm">
                              Change Selection
                            </Button>
                          </SupplierSelectionModal>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Packaging Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose packaging components from our verified supplier network
                      </p>
                      <SupplierSelectionModal
                        inputType="bottle"
                        onSelect={(supplier) => {
                          setSelectedPackagingSupplier(supplier);
                          // Auto-fill packaging data from supplier product (user-friendly fields + auto-sync to LCA)
                          const productAttrs = supplier.productAttributes || {};
                          const lcaData = supplier.lcaDataJson || {};
                          const supplierAddr = supplier.supplierAddress || {};
                          const origin = `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '';
                          
                          // Update user-friendly packaging tab fields
                          form.setValue('packaging.primaryContainer.material', productAttrs.material || '');
                          form.setValue('packaging.primaryContainer.weight', productAttrs.weight || productAttrs.weight_grams || 0);
                          form.setValue('packaging.primaryContainer.recycledContent', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                          form.setValue('packaging.primaryContainer.color', productAttrs.color || '');
                          form.setValue('packaging.primaryContainer.origin', origin);
                          if (productAttrs.thickness) {
                            form.setValue('packaging.primaryContainer.thickness', productAttrs.thickness);
                          }
                          if (productAttrs.recyclability) {
                            form.setValue('packaging.primaryContainer.recyclability', productAttrs.recyclability);
                          }
                          
                          // Update supplier information
                          form.setValue('packaging.supplierInformation.selectedSupplierId', supplier.supplierId);
                          form.setValue('packaging.supplierInformation.supplierName', supplier.supplierName);
                          form.setValue('packaging.supplierInformation.supplierCategory', supplier.supplierCategory);
                          form.setValue('packaging.supplierInformation.selectedProductId', supplier.id);
                          form.setValue('packaging.supplierInformation.selectedProductName', supplier.productName);
                          
                          // Auto-sync to LCA Data (for calculations)
                          form.setValue('lcaData.packagingDetailed.container.materialType', productAttrs.material?.toLowerCase() as any);
                          form.setValue('lcaData.packagingDetailed.container.weightGrams', productAttrs.weight || productAttrs.weight_grams || 0);
                          form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', productAttrs.recycledContent || productAttrs.recycled_content_percent || 0);
                          form.setValue('lcaData.packagingDetailed.container.color', productAttrs.color || '');
                          form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', origin);
                          if (productAttrs.thickness) {
                            form.setValue('lcaData.packagingDetailed.container.thickness', productAttrs.thickness);
                          }
                          if (productAttrs.recyclability) {
                            form.setValue('lcaData.packagingDetailed.container.recyclability', productAttrs.recyclability);
                          }
                          
                          // Supplier CO2 emissions data override (converted from grams to kg for calculation)
                          if (productAttrs.co2Emissions) {
                            const supplierCo2Kg = productAttrs.co2Emissions / 1000; // Convert grams to kg
                            form.setValue('environmentalImpact.co2Emissions', supplierCo2Kg);
                            
                            // Also update LCA data to reflect supplier-provided emissions
                            form.setValue('lcaData.packagingDetailed.container.co2EmissionsKg', supplierCo2Kg);
                            form.setValue('lcaData.packagingDetailed.container.hasSupplierLcaData', true);
                          }
                        }}
                        onManualEntry={() => {
                          setSelectedPackagingSupplier(null);
                        }}
                        selectedProduct={null}
                      >
                        <Button type="button">
                          <Search className="h-4 w-4 mr-2" />
                          Browse Packaging Suppliers
                        </Button>
                      </SupplierSelectionModal>
                    </div>
                  )}
                </div>

                {/* Primary Container */}
                <div className="space-y-4">
                  <h4 className="font-medium">Primary Container</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PackagingMaterialSelector
                      form={form}
                      fieldName="packaging.primaryContainer.material"
                      category="Container Materials"
                      label="Container Material *"
                      placeholder="Select container material"
                      description="Choose from OpenLCA authenticated container materials"
                      onMaterialChange={(materialName) => {
                        // Auto-sync to LCA Data with precise material mapping
                        let materialType = 'glass'; // default
                        if (materialName.toLowerCase().includes('glass')) materialType = 'glass';
                        else if (materialName.toLowerCase().includes('plastic') || materialName.toLowerCase().includes('pet') || materialName.toLowerCase().includes('hdpe')) materialType = 'plastic';
                        else if (materialName.toLowerCase().includes('aluminum')) materialType = 'aluminum';
                        else if (materialName.toLowerCase().includes('steel')) materialType = 'steel';
                        else if (materialName.toLowerCase().includes('ceramic')) materialType = 'ceramic';
                        
                        form.setValue('lcaData.packagingDetailed.container.materialType', materialType as any);
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (g) *</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.weightGrams', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.recycledContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycled Content (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="30" 
                              min="0" 
                              max="100"
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.recycledContentPercentage', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Colour</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Clear, Green, Amber" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.color', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.origin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin Location</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Paris, France" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data
                                form.setValue('lcaData.packagingDetailed.container.manufacturingLocation', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.recyclability"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Recyclability
                            <HelpBubble 
                              title="Container Recyclability Rating"
                              content="Assessment of how easily and effectively the container can be recycled in typical waste management systems.<br><br><strong>Rating Scale:</strong><br>• <strong>Not recyclable:</strong> No recycling infrastructure exists<br>• <strong>Limited recycling:</strong> Only specialty facilities<br>• <strong>Locally recyclable:</strong> Available in major cities<br>• <strong>Widely recyclable:</strong> Available in most areas<br>• <strong>Highly recyclable:</strong> Universal infrastructure<br>• <strong>Fully circular:</strong> Closed-loop system with high recovery rates<br><br><strong>Impact:</strong> Higher ratings significantly reduce end-of-life environmental impact."
                            />
                          </FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-sync to LCA Data
                            form.setValue('lcaData.packagingDetailed.container.recyclability', value);
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select recyclability level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="not-recyclable">Not Recyclable</SelectItem>
                              <SelectItem value="limited-recycling">Limited Recycling</SelectItem>
                              <SelectItem value="partially-recyclable">Partially Recyclable</SelectItem>
                              <SelectItem value="fully-recyclable">Fully Recyclable</SelectItem>
                              <SelectItem value="reusable">Reusable</SelectItem>
                              <SelectItem value="fully-circular">Fully Circular</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Supplier CO2 Data Display */}
                {selectedPackagingSupplier?.productAttributes?.co2Emissions && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="font-medium text-blue-800 mb-1">
                          Supplier-Verified CO2 Emissions
                        </h5>
                        <p className="text-2xl font-bold text-blue-900">
                          {selectedPackagingSupplier.productAttributes.co2Emissions}g CO2e
                        </p>
                        <p className="text-sm text-blue-600 mt-1">
                          Per unit carbon footprint (overrides OpenLCA calculations)
                        </p>
                      </div>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                )}

                {/* Auto-Sync Status */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-700">
                      Packaging data automatically syncs to LCA calculations
                      {selectedPackagingSupplier?.productAttributes?.co2Emissions && (
                        <span className="font-medium"> • Supplier CO2 data overrides OpenLCA</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Additional Packaging Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Additional Information</h4>
                  
                  <FormField
                    control={form.control}
                    name="packaging.packagingNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Packaging Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Additional packaging specifications or notes..." 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Any additional packaging information not covered above
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="packaging.qualityStandards"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality Standards & Certifications</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., FDA approved, ISO 9001, BRC certified" 
                            value={field.value?.join(', ') || ''}
                            onChange={(e) => {
                              const standards = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                              field.onChange(standards);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of quality standards and certifications
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Labels & Printing */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Labels & Printing</h4>
                    <SupplierSelectionModal
                      inputType="label"
                      onSelect={(supplier) => {
                        // Auto-fill label data from supplier product
                        const productAttrs = supplier.productAttributes || {};
                        const supplierAddr = supplier.supplierAddress || {};
                        form.setValue('packaging.labeling.labelMaterial', productAttrs.material || '');
                        form.setValue('packaging.labeling.labelWeight', productAttrs.weight || 0);
                        form.setValue('packaging.labeling.printingMethod', productAttrs.printing_method || '');
                        form.setValue('packaging.labeling.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
                      }}
                      onManualEntry={() => {}}
                      selectedProduct={null}
                    >
                      <Button type="button" variant="outline" size="sm">
                        <Search className="h-3 w-3 mr-1" />
                        Browse Label Suppliers
                      </Button>
                    </SupplierSelectionModal>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PackagingMaterialSelector
                      form={form}
                      fieldName="packaging.labeling.labelMaterial"
                      category="Label Materials"
                      label="Label Material"
                      placeholder="Select label material"
                      description="Choose from OpenLCA authenticated label materials"
                      onMaterialChange={(materialName) => {
                        // Auto-sync to LCA Data with precise material mapping
                        let materialType = 'paper'; // default
                        if (materialName.toLowerCase().includes('paper')) materialType = 'paper';
                        else if (materialName.toLowerCase().includes('plastic') || materialName.toLowerCase().includes('film')) materialType = 'plastic';
                        else if (materialName.toLowerCase().includes('aluminum') || materialName.toLowerCase().includes('foil')) materialType = 'foil';
                        else if (materialName.toLowerCase().includes('biodegradable')) materialType = 'biodegradable';
                        
                        form.setValue('lcaData.packagingDetailed.label.materialType', materialType as any);
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.labeling.labelWeight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Weight (g)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="15" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="packaging.labeling.printingMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Printing Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="digital">Digital</SelectItem>
                              <SelectItem value="offset">Offset</SelectItem>
                              <SelectItem value="flexographic">Flexographic</SelectItem>
                              <SelectItem value="screen">Screen</SelectItem>
                              <SelectItem value="none">No Printing</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <PackagingMaterialSelector
                      form={form}
                      fieldName="packaging.labeling.inkType"
                      category="Printing Materials"
                      label="Ink Type"
                      placeholder="Select ink type"
                      description="Choose from OpenLCA authenticated printing inks"
                      onMaterialChange={(materialName) => {
                        // Auto-sync to LCA Data with precise ink mapping
                        let inkType = 'conventional'; // default
                        if (materialName.toLowerCase().includes('water')) inkType = 'water_based';
                        else if (materialName.toLowerCase().includes('solvent')) inkType = 'solvent_based';
                        else if (materialName.toLowerCase().includes('uv')) inkType = 'conventional';
                        else if (materialName.toLowerCase().includes('soy')) inkType = 'eco_friendly';
                        
                        form.setValue('lcaData.packagingDetailed.label.inkType', inkType as any);
                      }}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="packaging.labeling.labelSize"
                    render={({ field }) => (
                      <FormItem className="md:w-1/2">
                        <FormLabel>Label Size (cm²)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="45.5" 
                            step="0.1"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>Total surface area of all labels</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="packaging.labeling.origin"
                    render={({ field }) => (
                      <FormItem className="md:w-1/2">
                        <FormLabel>Origin Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Milan, Italy" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Closure System */}
                <div className="space-y-4">
                  <h4 className="font-medium">Closure System</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <PackagingMaterialSelector
                      form={form}
                      fieldName="packaging.closure.material"
                      category="Closure Materials"
                      label="Closure Type & Material *"
                      placeholder="Select closure material"
                      description="Choose from OpenLCA authenticated closure materials"
                      onMaterialChange={(materialName) => {
                        // Auto-sync closure type from material name
                        let closureType = 'cork'; // default
                        if (materialName.toLowerCase().includes('cork') && !materialName.toLowerCase().includes('synthetic')) {
                          closureType = 'cork';
                        } else if (materialName.toLowerCase().includes('synthetic cork')) {
                          closureType = 'synthetic-cork';
                        } else if (materialName.toLowerCase().includes('screw cap')) {
                          closureType = 'screw-cap';
                        } else if (materialName.toLowerCase().includes('crown cap')) {
                          closureType = 'crown-cap';
                        } else if (materialName.toLowerCase().includes('swing top')) {
                          closureType = 'swing-top';
                        }
                        
                        // Auto-sync closure type for backward compatibility
                        form.setValue('packaging.closure.closureType', closureType);
                        
                        // Auto-sync to LCA Data with precise material mapping
                        let materialType = 'cork'; // default
                        if (materialName.toLowerCase().includes('natural cork')) materialType = 'cork';
                        else if (materialName.toLowerCase().includes('synthetic cork')) materialType = 'synthetic_cork';
                        else if (materialName.toLowerCase().includes('aluminum') || materialName.toLowerCase().includes('screw cap')) materialType = 'screw_cap';
                        else if (materialName.toLowerCase().includes('crown cap')) materialType = 'crown_cap';
                        
                        form.setValue('lcaData.packagingDetailed.closure.materialType', materialType as any);
                      }}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.weight"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Weight (g)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2.5" 
                              step="0.1"
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.origin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origin Location</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Porto, Portugal" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Secondary Packaging */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Secondary Packaging</h4>
                    <SupplierSelectionModal
                      inputType="secondary"
                      onSelect={(supplier) => {
                        // Auto-fill secondary packaging data from supplier product
                        const productAttrs = supplier.productAttributes || {};
                        const supplierAddr = supplier.supplierAddress || {};
                        form.setValue('packaging.secondaryPackaging.hasSecondaryPackaging', true);
                        form.setValue('packaging.secondaryPackaging.boxMaterial', productAttrs.material || '');
                        form.setValue('packaging.secondaryPackaging.boxWeight', productAttrs.weight || 0);
                        form.setValue('packaging.secondaryPackaging.origin', `${supplierAddr.city || ''}, ${supplierAddr.country || ''}`.replace(/^, |, $/, '') || '');
                      }}
                      onManualEntry={() => {}}
                      selectedProduct={null}
                    >
                      <Button type="button" variant="outline" size="sm">
                        <Search className="h-3 w-3 mr-1" />
                        Browse Secondary Packaging
                      </Button>
                    </SupplierSelectionModal>
                  </div>

                  <FormField
                    control={form.control}
                    name="packaging.secondaryPackaging.hasSecondaryPackaging"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Uses Secondary Packaging</FormLabel>
                          <FormDescription>
                            Product is packaged in boxes, cases, or additional protective materials
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch('packaging.secondaryPackaging.hasSecondaryPackaging') && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PackagingMaterialSelector
                          form={form}
                          fieldName="packaging.secondaryPackaging.boxMaterial"
                          category="Secondary Packaging"
                          label="Box/Case Material"
                          placeholder="Select box material"
                          description="Choose from OpenLCA authenticated secondary packaging materials"
                          onMaterialChange={(materialName) => {
                            // Auto-sync to LCA Data with precise material mapping
                            let boxMaterial = 'cardboard'; // default
                            if (materialName.toLowerCase().includes('cardboard') || materialName.toLowerCase().includes('corrugated')) boxMaterial = 'cardboard';
                            else if (materialName.toLowerCase().includes('wood')) boxMaterial = 'wood';
                            else if (materialName.toLowerCase().includes('plastic')) boxMaterial = 'plastic';
                            else if (materialName.toLowerCase().includes('metal') || materialName.toLowerCase().includes('tin')) boxMaterial = 'metal';
                            
                            form.setValue('lcaData.packagingDetailed.secondaryPackaging.boxMaterial', boxMaterial as any);
                            form.setValue('lcaData.packagingDetailed.secondaryPackaging.hasBox', true);
                          }}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.boxWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Weight (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="120" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <PackagingMaterialSelector
                          form={form}
                          fieldName="packaging.secondaryPackaging.fillerMaterial"
                          category="Protective Materials"
                          label="Protective/Filler Material"
                          placeholder="Select protective material"
                          description="Choose from OpenLCA authenticated protective packaging materials"
                          onMaterialChange={(materialName) => {
                            // Auto-sync to LCA Data with precise material mapping
                            let protectiveMaterial = materialName; // Use full material name for LCA precision
                            form.setValue('lcaData.packagingDetailed.secondaryPackaging.protectiveMaterial', protectiveMaterial);
                          }}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.fillerWeight"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filler Weight (g)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  placeholder="25" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.origin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Origin Location</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Berlin, Germany" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Production Tab */}
          <TabsContent value="production" className="space-y-6">
            {/* Production Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-avallen-green" />
                  Production Type Selection
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  How is this product manufactured? Choose the option that best describes your production setup.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ProductionTypeSelector
                  onComplete={(productionData) => {
                    // Update form based on production type selection
                    form.setValue('production.productionType', productionData.productionType);
                    
                    if (productionData.productionType === 'in-house') {
                      // Clear other fields and set legacy compatibility
                      form.setValue('production.ecoinventProcessId', undefined);
                      form.setValue('production.stages', undefined);
                      form.setValue('production.productionModel', 'in-house');
                    } else if (productionData.productionType === 'contract-manufacturing') {
                      // Set ecoinvent process and clear other fields
                      form.setValue('production.ecoinventProcessId', productionData.ecoinventProcessId);
                      form.setValue('production.facilityId', undefined);
                      form.setValue('production.stages', undefined);
                      form.setValue('production.productionModel', 'outsourced');
                    } else if (productionData.productionType === 'hybrid') {
                      // Set stages and clear other fields
                      form.setValue('production.stages', productionData.stages);
                      form.setValue('production.ecoinventProcessId', undefined);
                      form.setValue('production.facilityId', undefined);
                      form.setValue('production.productionModel', 'hybrid');
                    }
                    
                    // Show success toast
                    toast({
                      title: "✅ Production Type Set",
                      description: `Production configured as ${productionData.productionType.replace('-', ' ')}`,
                      duration: 3000,
                    });
                  }}
                  onBack={() => {
                    // Navigate to Company page facilities tab
                    window.open('/company?tab=production-facilities', '_blank');
                  }}
                />
              </CardContent>
            </Card>

            {/* Annual Production Volume */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-avallen-green" />
                  Annual Production Volume
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter the number of units you produce annually for this product.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="production.annualProductionVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Units per Year</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="e.g., 300000" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-annual-production-volume"
                          />
                        </FormControl>
                        <FormDescription>
                          This helps calculate the environmental impact per unit.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Auto-Sync Status */}
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-700">
                      Production data automatically syncs to LCA calculations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Distribution & Logistics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="distribution.averageTransportDistance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Transport Distance (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="500" 
                            {...field} 
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                              // Auto-sync to LCA Data
                              form.setValue('lcaData.distribution.avgDistanceToDcKm', value);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="distribution.transportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="road">Road (Truck)</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="sea">Sea Freight</SelectItem>
                            <SelectItem value="air">Air Freight</SelectItem>
                            <SelectItem value="multimodal">Multimodal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LCA Data Tab */}
          <TabsContent value="lca-data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-blue-600" />
                  Life Cycle Assessment Data
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Factory className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-green-900 mb-1">Facility-Based LCA Integration</h4>
                      <p className="text-sm text-green-800">
                        Production metrics for LCA calculations are now automatically populated from the selected production facility. 
                        This ensures consistency and accuracy across all your products while reducing manual data entry.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications & Awards Tab */}
          <TabsContent value="certifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-avallen-green" />
                  Certifications & Awards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Certifications</h4>
                  <div className="space-y-2">
                    {['Organic', 'Fairtrade', 'B-Corp', 'Carbon Neutral', 'ISO 14001', 'LEED Certified', 'EU Eco-label'].map((cert) => (
                      <FormField
                        key={cert}
                        control={form.control}
                        name="certifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(cert)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, cert]);
                                  } else {
                                    field.onChange(current.filter((c: string) => c !== cert));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{cert}</FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Awards</h4>
                  <FormField
                    control={form.control}
                    name="awards"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>List any awards or recognitions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter awards separated by commas (e.g., Best Sustainable Product 2024, Green Business Award 2023)" 
                            rows={3}
                            {...field} 
                            onChange={(e) => field.onChange(e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean))}
                            value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* End of Life Tab */}
          <TabsContent value="endoflife" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-avallen-green" />
                  End of Life Management
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Define recycling, disposal, and end-of-life management for your product packaging.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Returnable Container */}
                <FormField
                  control={form.control}
                  name="endOfLife.returnableContainer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Returnable Container</FormLabel>
                        <FormDescription>
                          Customers can return containers for reuse or refill
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Recycling Rate */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endOfLife.recyclingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expected Recycling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="75" 
                            min="0"
                            max="100"
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Estimated percentage of packaging that gets recycled
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endOfLife.disposalMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Disposal Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select disposal method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="recycling">Recycling</SelectItem>
                            <SelectItem value="landfill">Landfill</SelectItem>
                            <SelectItem value="incineration">Incineration</SelectItem>
                            <SelectItem value="composting">Composting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Consumer Education */}
                <FormField
                  control={form.control}
                  name="endOfLife.consumerEducation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Education Program</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe how you educate consumers about proper disposal..." 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Information about how consumers are educated on proper disposal
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Biodegradability */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Biodegradability Features</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.organic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Organic Materials</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.composting"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Home Composting</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.marineBiodegradable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Marine Biodegradable</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


        </Tabs>

        {/* Submit Button */}
        <div className="flex justify-end space-x-4 pt-6">
          {onSaveDraft && (
            <Button 
              type="button"
              variant="outline" 
              onClick={handleSaveDraft}
              disabled={isDraftSaving}
            >
              {isDraftSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Draft...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Draft
                </>
              )}
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting}
            onClick={async (e) => {
              e.preventDefault();
              
              console.log('🔄 Button clicked - starting validation');
              console.log('🔍 Current form values:', form.getValues());
              console.log('🔍 Current packaging material value:', form.getValues().packaging?.primaryContainer?.material);
              
              // Trigger validation
              const isValid = await form.trigger();
              console.log('✅ Form validation result:', isValid);
              
              if (!isValid) {
                // Create error summary with tab guidance
                const errors = form.formState.errors;
                console.log('🚫 Form validation errors:', errors);
                console.log('🔍 Form values after validation:', form.getValues());
                const errorSummary = [];
                
                // Check each tab for errors
                if (errors.name || errors.sku || errors.type || errors.volume) {
                  errorSummary.push("• Basic Info tab: Complete required product details");
                }
                if (errors.packaging?.primaryContainer?.material) {
                  errorSummary.push("• Packaging tab: Select container material");
                }
                
                if (errorSummary.length > 0) {
                  toast({
                    title: "Required Fields Missing",
                    description: `Please complete the following:\n${errorSummary.join('\n')}`,
                    variant: "destructive",
                  });
                  
                  // Navigate to first tab with errors
                  if (errors.name || errors.sku || errors.type || errors.volume) {
                    setActiveTab('basic');
                  } else if (errors.packaging) {
                    setActiveTab('packaging');
                  }
                }
                
                return;
              }
              
              // If validation passes, submit the form
              const data = form.getValues();
              handleSubmit(data);
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Product...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Product
              </>
            )}
          </Button>
        </div>
        </form>
      </Form>
    </TourProvider>
  );
}
