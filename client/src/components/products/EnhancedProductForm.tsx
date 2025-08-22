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
import { Save, Loader2, Package, Wheat, Box, Factory, Leaf, Award, Truck, Recycle, Plus, Trash2, Search, Building2, CheckCircle, Activity, Calculator } from 'lucide-react';
import { ImageUploader } from '@/components/ImageUploader';
import { TourProvider } from '@/components/tour/TourProvider';
import { TourButton } from '@/components/tour/TourButton';
import { HelpBubble } from '@/components/ui/help-bubble';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { IngredientSearchSelector } from '@/components/lca/IngredientSearchSelector';
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
  })).min(1, "At least one ingredient is required"),
  
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
  
  // Production Tab - Comprehensive manufacturing data collection
  production: z.object({
    productionModel: z.string().min(1, "Production model is required"),
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
      distanceKm: z.number().positive().optional(),
      mode: z.enum(['truck', 'rail', 'ship', 'air', 'multimodal']).optional(),
      fuelEfficiencyLper100km: z.number().positive().optional(),
      loadFactor: z.number().min(0).max(100).optional(),
      refrigerationRequired: z.boolean().default(false),
    }),
    
    // Section 3: Processing & Production
    processing: z.object({
      waterM3PerTonCrop: z.number().nonnegative().optional(),
      electricityKwhPerTonCrop: z.number().nonnegative().optional(),
      lpgKgPerLAlcohol: z.number().nonnegative().optional(),
      netWaterUseLPerBottle: z.number().nonnegative().optional(),
      angelsSharePercentage: z.number().min(0).max(100).optional(),
      renewableEnergyPercent: z.number().min(0).max(100).optional(),
      fermentation: z.object({
        fermentationTime: z.number().positive().optional(), // days
        temperatureControl: z.boolean().default(false),
        yeastType: z.string().optional(),
        sugarAddedKg: z.number().nonnegative().optional(),
      }).optional(),
      distillation: z.object({
        distillationRounds: z.number().positive().optional(),
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
        weightGrams: z.number().positive().optional(),
        inkType: z.enum(['conventional', 'eco_friendly', 'soy_based']).optional(),
        adhesiveType: z.enum(['water_based', 'solvent_based', 'hot_melt']).optional(),
        // Additional fields from original packaging tab
        printingMethod: z.string().optional(),
        labelSize: z.number().optional(),
      }).optional(),
      closure: z.object({
        materialType: z.enum(['cork', 'synthetic_cork', 'screw_cap', 'crown_cap', 'aluminum']).optional(),
        weightGrams: z.number().positive().optional(),
        hasLiner: z.boolean().default(false),
        linerMaterial: z.string().optional(),
      }).optional(),
      secondaryPackaging: z.object({
        hasBox: z.boolean().default(false),
        boxMaterial: z.enum(['cardboard', 'wood', 'plastic', 'metal']).optional(),
        boxWeightGrams: z.number().positive().optional(),
        protectiveMaterial: z.string().optional(),
        protectiveMaterialWeightGrams: z.number().nonnegative().optional(),
        // Additional fields from original packaging tab
        fillerMaterial: z.string().optional(),
        fillerWeight: z.number().optional(),
      }).optional(),
    }),
    
    // Section 5: Distribution & Transport
    distribution: z.object({
      avgDistanceToDcKm: z.number().positive().optional(),
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
    }),
    
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
  const [lcaProgress, setLcaProgress] = useState<number>(0);
  const [lcaStatus, setLcaStatus] = useState<'idle' | 'calculating' | 'completed' | 'failed'>('idle');

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
      setLcaStatus('calculating');
      setLcaProgress(10);
      
      toast({
        title: "LCA Calculation Started",
        description: `Estimated completion time: ${Math.round(data.estimatedDuration / 1000)} seconds`,
      });
      
      // Start polling for status updates
      pollLcaStatus(data.jobId);
    },
    onError: (error: any) => {
      setLcaStatus('failed');
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
        
        setLcaProgress(status.progress || 0);
        
        if (status.status === 'completed') {
          setLcaStatus('completed');
          clearInterval(pollInterval);
          
          toast({
            title: "LCA Calculation Complete!",
            description: "Environmental impact assessment has been generated successfully.",
          });
          
          // Invalidate product queries to refresh data
          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          
        } else if (status.status === 'failed') {
          setLcaStatus('failed');
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
        setLcaStatus('failed');
      }
    }, 2000); // Poll every 2 seconds
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(pollInterval);
      if (lcaStatus === 'calculating') {
        setLcaStatus('failed');
        toast({
          title: "LCA Calculation Timeout",
          description: "Calculation took longer than expected",
          variant: "destructive",
        });
      }
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
        <form onSubmit={(e) => {
          console.log('📝 Form onSubmit event triggered');
          form.handleSubmit((data) => {
            console.log('✅ Form validation passed, calling handleSubmit');
            handleSubmit(data);
          })(e);
        }} className="w-full" onKeyDown={(e) => {
          // Prevent form submission on Enter key unless we're on the last tab
          if (e.key === 'Enter' && activeTab !== 'lcadata') {
            e.preventDefault();
          }
        }}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-8 mb-6">
            <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
            <TabsTrigger value="ingredients" className="text-xs">Ingredients</TabsTrigger>
            <TabsTrigger value="packaging" className="text-xs">Packaging</TabsTrigger>
            <TabsTrigger value="production" className="text-xs">Production</TabsTrigger>
            <TabsTrigger value="certifications" className="text-xs">Certifications</TabsTrigger>
            <TabsTrigger value="distribution" className="text-xs">Distribution</TabsTrigger>
            <TabsTrigger value="endoflife" className="text-xs">End of Life</TabsTrigger>
            <TabsTrigger value="lcadata" className="text-xs">LCA Data</TabsTrigger>
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
                    <FormField
                      control={form.control}
                      name="packaging.primaryContainer.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material *</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-sync to LCA Data
                            form.setValue('lcaData.packagingDetailed.container.materialType', value.toLowerCase() as any);
                          }} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="glass">Glass</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="aluminum">Aluminum</SelectItem>
                              <SelectItem value="steel">Steel</SelectItem>
                              <SelectItem value="cardboard">Cardboard</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
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
                          <FormLabel>Color</FormLabel>
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
                    <FormField
                      control={form.control}
                      name="packaging.labeling.labelMaterial"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paper">Paper</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="metal">Metal</SelectItem>
                              <SelectItem value="fabric">Fabric</SelectItem>
                              <SelectItem value="none">No Labels</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
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
                    
                    <FormField
                      control={form.control}
                      name="packaging.labeling.inkType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ink Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ink type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="water-based">Water-based</SelectItem>
                              <SelectItem value="solvent-based">Solvent-based</SelectItem>
                              <SelectItem value="uv-cured">UV-cured</SelectItem>
                              <SelectItem value="eco-friendly">Eco-friendly</SelectItem>
                              <SelectItem value="none">No Ink</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
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
                    <FormField
                      control={form.control}
                      name="packaging.closure.closureType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select closure type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cork">Cork</SelectItem>
                              <SelectItem value="screw-cap">Screw Cap</SelectItem>
                              <SelectItem value="crown-cap">Crown Cap</SelectItem>
                              <SelectItem value="swing-top">Swing Top</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="packaging.closure.material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Material</FormLabel>
                          <FormControl>
                            <Input placeholder="Natural cork, Aluminum, Plastic" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.boxMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box/Case Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cardboard">Cardboard</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="wood">Wood</SelectItem>
                                  <SelectItem value="metal">Metal</SelectItem>
                                  <SelectItem value="none">None</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
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
                        <FormField
                          control={form.control}
                          name="packaging.secondaryPackaging.fillerMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filler Material</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select filler" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="foam">Foam</SelectItem>
                                  <SelectItem value="paper">Paper</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="biodegradable">Biodegradable Packing</SelectItem>
                                  <SelectItem value="none">No Filler</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-avallen-green" />
                  Production Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Supplier Selection for Production */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Select Production Partner
                  </h4>
                  
                  {selectedProductionSupplier ? (
                    <Card className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-green-800">{selectedProductionSupplier.supplierName}</h4>
                            <p className="text-sm text-green-600">{selectedProductionSupplier.location}</p>
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              Selected Producer
                            </Badge>
                          </div>
                          <SupplierSelectionModal
                            inputType="contract"
                            onSelect={(supplier) => {
                              setSelectedProductionSupplier(supplier);
                              // Auto-fill production data from supplier product
                              const productAttrs = supplier.productAttributes || {};
                              const lcaData = supplier.lcaDataJson || {};
                              
                              form.setValue('production.productionModel', 'contract');
                              form.setValue('production.annualProductionVolume', productAttrs.annual_capacity || 0);
                              
                              // Auto-fill energy data if available
                              if (lcaData.energy_consumption) {
                                form.setValue('production.energyConsumption.electricityKwh', lcaData.energy_consumption);
                              }
                            }}
                            onManualEntry={() => {
                              setSelectedProductionSupplier(null);
                            }}
                            selectedProduct={selectedProductionSupplier}
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
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Producer Selected</h3>
                      <p className="text-muted-foreground mb-4">
                        Choose a verified producer from our network
                      </p>
                      <SupplierSelectionModal
                        inputType="contract"
                        onSelect={(supplier) => {
                          setSelectedProductionSupplier(supplier);
                          // Auto-fill production data from supplier product
                          const productAttrs = supplier.productAttributes || {};
                          const lcaData = supplier.lcaDataJson || {};
                          
                          form.setValue('production.productionModel', 'contract');
                          form.setValue('production.annualProductionVolume', productAttrs.annual_capacity || 0);
                          
                          // Auto-fill energy data if available
                          if (lcaData.energy_consumption) {
                            form.setValue('production.energyConsumption.electricityKwh', lcaData.energy_consumption);
                          }
                        }}
                        onManualEntry={() => {
                          setSelectedProductionSupplier(null);
                        }}
                        selectedProduct={null}
                      >
                        <Button type="button">
                          <Search className="h-4 w-4 mr-2" />
                          Browse Verified Producers
                        </Button>
                      </SupplierSelectionModal>
                    </div>
                  )}
                </div>

                {/* Production Model */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="production.productionModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Model *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select production model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="in-house">In-house Production</SelectItem>
                            <SelectItem value="contract">Contract Manufacturing</SelectItem>
                            <SelectItem value="co-packing">Co-packing</SelectItem>
                            <SelectItem value="hybrid">Hybrid Model</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="production.annualProductionVolume"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Annual Production Volume *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="10000" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Production Location Details */}
                <div className="space-y-4">
                  <h4 className="font-medium">Production Location Details</h4>
                  <p className="text-sm text-gray-600">Required for transportation distance calculations and fuel emission estimates</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.facilityLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Production Facility Location *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Edinburgh, Scotland, UK" {...field} />
                          </FormControl>
                          <FormDescription>City, Country for transportation calculations</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="production.facilityAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Full address for precise location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>



                {/* Basic Processing Data */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-blue-900">Basic Processing Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.processing.electricityKwhPerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Electricity (kWh/ton crop)
                            <HelpBubble 
                              title="Processing Electricity Usage"
                              content="Electrical energy consumed per ton of raw crop processed into final product.<br><br><strong>Typical consumption:</strong><br>• <strong>Beer production:</strong> 150-300 kWh/ton grain<br>• <strong>Wine making:</strong> 50-120 kWh/ton grapes<br>• <strong>Distillation (spirits):</strong> 800-1,500 kWh/ton grain<br>• <strong>Fruit processing:</strong> 100-250 kWh/ton fruit<br><br><strong>Major energy uses:</strong><br>• Heating/cooling processes (50-60%)<br>• Pumps and motors (20-25%)<br>• Control systems (10-15%)<br>• Packaging equipment (5-10%)"
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="150" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.electricityKwhPerTonCrop', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.processing.lpgKgPerLAlcohol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LPG Usage (kg/L alcohol)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.25" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.lpgKgPerLAlcohol', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="production.processing.angelsSharePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Angel's Share (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="2.5" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.angelsSharePercentage', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.processing.waterM3PerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Processing Water (m³/ton crop)
                            <HelpBubble 
                              title="Production Water Usage"
                              content="Water consumed during processing operations per ton of raw crop.<br><br><strong>Typical usage:</strong><br>• <strong>Beer production:</strong> 4-7 m³/ton grain<br>• <strong>Wine making:</strong> 1.5-3 m³/ton grapes<br>• <strong>Distillation:</strong> 8-15 m³/ton grain<br>• <strong>Juice production:</strong> 2-5 m³/ton fruit<br><br><strong>Major uses:</strong><br>• Equipment cleaning (40-50%)<br>• Processing and dilution (30-35%)<br>• Cooling systems (15-20%)<br>• Steam generation (5-10%)"
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="3.5" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.waterM3PerTonCrop', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.processing.renewableEnergyPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewable Energy (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="50.0" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab - need to add this field to LCA schema
                                form.setValue('lcaData.processing.renewableEnergyPercent', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Fermentation Process */}
                <div className="bg-green-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-green-900">Fermentation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.fermentation.fermentationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fermentation Time (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="14" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.fermentation.fermentationTime', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.fermentation.yeastType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeast Type</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Wild, Commercial, House strain" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.fermentation.yeastType', e.target.value);
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
                      name="production.fermentation.temperatureControl"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.fermentation.temperatureControl', checked);
                              }}
                            />
                          </FormControl>
                          <FormLabel>Temperature Controlled</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.fermentation.sugarAddedKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Added Sugar (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="0" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.fermentation.sugarAddedKg', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Distillation Process */}
                <div className="bg-orange-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-orange-900">Distillation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.distillation.distillationRounds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Distillation Rounds
                            <HelpBubble 
                              title="Number of Distillation Steps"
                              content="The number of distillation passes used to achieve desired alcohol content and purity.<br><br><strong>Typical industry standards:</strong><br>• <strong>Whisky/Bourbon:</strong> 2 rounds (double distillation)<br>• <strong>Irish whiskey:</strong> 3 rounds (triple distillation)<br>• <strong>Vodka:</strong> 3-5 rounds for purity<br>• <strong>Brandy:</strong> 2-3 rounds depending on style<br><br><strong>Environmental impact:</strong><br>Each additional round requires significant energy input but improves product quality and reduces waste."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="2" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.distillation.distillationRounds', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.distillation.energySourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Source</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-sync to LCA Data tab
                            form.setValue('lcaData.processing.distillation.energySourceType', value as any);
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select energy source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="electric">Electric</SelectItem>
                              <SelectItem value="gas">Gas</SelectItem>
                              <SelectItem value="biomass">Biomass</SelectItem>
                              <SelectItem value="steam">Steam</SelectItem>
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
                      name="production.distillation.heatRecoverySystem"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.distillation.heatRecoverySystem', checked);
                              }}
                            />
                          </FormControl>
                          <FormLabel className="flex items-center gap-2">
                            Heat Recovery System
                            <HelpBubble 
                              title="Heat Recovery Technology"
                              content="Systems that capture and reuse waste heat from distillation processes, significantly reducing energy consumption.<br><br><strong>Energy savings:</strong><br>• <strong>Without heat recovery:</strong> 100% energy input required<br>• <strong>With heat recovery:</strong> 30-50% energy savings possible<br><br><strong>Common systems:</strong><br>• Heat exchangers for preheating<br>• Vapor recompression systems<br>• Thermal energy storage<br><br><strong>Environmental benefit:</strong><br>Can reduce process carbon footprint by 25-40% in distillation operations."
                            />
                          </FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.distillation.copperUsageKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Copper Usage (kg)
                            <HelpBubble 
                              title="Copper in Distillation Equipment"
                              content="Amount of copper used in stills, condensers, and piping. Copper is essential for spirits production but has environmental impact.<br><br><strong>Typical usage:</strong><br>• <strong>Pot stills:</strong> 500-2,000 kg per still<br>• <strong>Column stills:</strong> 200-800 kg per still<br>• <strong>Condensers:</strong> 100-500 kg per unit<br><br><strong>Environmental considerations:</strong><br>• High embodied carbon in copper production<br>• Long equipment lifespan (20-50 years)<br>• High recycling value at end of life<br><br><strong>Quality impact:</strong><br>Copper removes sulfur compounds, essential for premium spirits quality."
                            />
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.distillation.copperUsageKg', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Maturation Process */}
                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                  <h4 className="font-medium text-purple-900">Maturation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="production.maturation.maturationTimeMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maturation Time (months)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="24" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.maturation.maturationTimeMonths', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.maturation.barrelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barrel Type</FormLabel>
                          <Select onValueChange={(value) => {
                            field.onChange(value);
                            // Auto-sync to LCA Data tab
                            form.setValue('lcaData.processing.maturation.barrelType', value as any);
                          }} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select barrel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new-oak">New Oak</SelectItem>
                              <SelectItem value="used-oak">Used Oak</SelectItem>
                              <SelectItem value="stainless-steel">Stainless Steel</SelectItem>
                              <SelectItem value="concrete">Concrete</SelectItem>
                              <SelectItem value="ceramic">Ceramic</SelectItem>
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
                      name="production.maturation.barrelOrigin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barrel Origin</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., French Oak, American Oak" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.maturation.barrelOrigin', e.target.value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="production.maturation.barrelReuseCycles"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barrel Reuse Cycles</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="3" 
                              {...field} 
                              onChange={(e) => {
                                const value = parseFloat(e.target.value) || 0;
                                field.onChange(value);
                                // Auto-sync to LCA Data tab
                                form.setValue('lcaData.processing.maturation.barrelReuseCycles', value);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="text-sm text-green-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Auto-syncing to LCA Data tab
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
                    name="distribution.primaryTransportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Transport Mode</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          // Auto-sync to LCA Data
                          const lcaMapping: Record<string, string> = { road: 'truck', rail: 'rail', sea: 'ship', air: 'air', multimodal: 'multimodal' };
                          form.setValue('lcaData.distribution.primaryTransportMode', lcaMapping[value] as any);
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="road">Road Transport</SelectItem>
                            <SelectItem value="rail">Rail Transport</SelectItem>
                            <SelectItem value="sea">Sea Transport</SelectItem>
                            <SelectItem value="air">Air Transport</SelectItem>
                            <SelectItem value="multimodal">Multimodal</SelectItem>
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
                    name="distribution.distributionCenters"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Distribution Centers</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="3" 
                            {...field} 
                            onChange={(e) => {
                              const value = parseFloat(e.target.value) || 0;
                              field.onChange(value);
                              // Auto-sync to LCA Data - no direct mapping for distribution centers
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="distribution.coldChainRequired"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              // Auto-sync to LCA Data
                              form.setValue('lcaData.distribution.coldChainRequirement', Boolean(value));
                            }}
                          />
                        </FormControl>
                        <FormLabel>Cold chain required</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Additional Distribution Fields */}
                <div className="bg-green-50 p-4 rounded-lg space-y-4">
                  <h5 className="font-medium text-green-900">Advanced Distribution Metrics</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="distribution.palletizationEfficiency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Palletization Efficiency (%)
                            <HelpBubble 
                              title="Palletization Efficiency"
                              content="This measures how efficiently your products are packed on pallets for transport. It's calculated as:<br><br><strong>Formula:</strong> (Product Volume × Units per Pallet) ÷ Total Pallet Space × 100<br><br><strong>Impact:</strong> Higher efficiency (85%+) reduces transport emissions per unit. Poor efficiency (below 70%) significantly increases carbon footprint.<br><br><strong>Typical ranges:</strong><br>• Wine bottles: 75-85%<br>• Spirits bottles: 80-90%<br>• Canned beverages: 85-95%"
                            />
                          </FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            Percentage of container space utilized during palletized transport (typical range: 70-95%)
                          </FormDescription>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="85.5" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
                                form.setValue('lcaData.distribution.palletizationEfficiency', parseFloat(e.target.value) || 0);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="distribution.temperatureRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature Range (°C)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="2-8°C" 
                              {...field} 
                              onChange={(e) => {
                                field.onChange(e.target.value);
                                form.setValue('lcaData.distribution.temperatureRangeCelsius.min', 2);
                                form.setValue('lcaData.distribution.temperatureRangeCelsius.max', 8);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Auto-Sync Status */}
                <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <p className="text-sm text-green-700">
                      Distribution data automatically syncs to LCA calculations
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LCA Data Collection Tab */}
          <TabsContent value="lcadata" className="space-y-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-blue-900">Enhanced LCA Data Collection</h3>
                <TourButton variant="outline" size="sm" />
              </div>
              <p className="text-sm text-blue-700">
                Collect granular life cycle assessment data points for accurate environmental impact calculations. 
                This data feeds directly into ISO 14040/14044 compliant LCA reports.
              </p>
              
              {/* Auto-fill Status Indicator */}
              {(selectedIngredientSuppliers.length > 0 || selectedPackagingSupplier || selectedProductionSupplier) && (
                <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-md">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-green-800">Auto-filled from Supplier Selection:</p>
                      <ul className="text-xs text-green-700 space-y-1">
                        {selectedIngredientSuppliers.length > 0 && (
                          <li>• Agriculture data from {selectedIngredientSuppliers.length} ingredient supplier(s)</li>
                        )}
                        {selectedPackagingSupplier && (
                          <li>• Packaging data from {selectedPackagingSupplier.supplierName}</li>
                        )}
                        {selectedProductionSupplier && (
                          <li>• Production data from {selectedProductionSupplier.supplierName}</li>
                        )}
                      </ul>
                      <p className="text-xs text-green-600 mt-2">
                        <strong>Manual Review Required:</strong> Verify auto-filled values and complete missing fields below.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Comprehensive Autofill Status Summary */}
            <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200 mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Auto-Fill Status Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Ingredients Tab</h4>
                    <div className="space-y-1 text-xs">
                      {form.getValues('ingredients')?.length > 0 && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Main crop: {form.getValues('ingredients')?.[0]?.name}</span>
                        </div>
                      )}
                      {!form.getValues('ingredients')?.length && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="w-3 h-3 border border-gray-300 rounded-full" />
                          <span>No ingredient data yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Packaging Tab</h4>
                    <div className="space-y-1 text-xs">
                      {form.getValues('packaging.primaryContainer.material') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Container: {form.getValues('packaging.primaryContainer.material')}</span>
                        </div>
                      )}
                      {form.getValues('packaging.primaryContainer.weight') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Weight: {form.getValues('packaging.primaryContainer.weight')}g</span>
                        </div>
                      )}
                      {!form.getValues('packaging.primaryContainer.material') && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="w-3 h-3 border border-gray-300 rounded-full" />
                          <span>No packaging data yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Production Tab</h4>
                    <div className="space-y-1 text-xs">
                      {form.getValues('production.maturation.barrelType') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Barrel: {form.getValues('production.maturation.barrelType')}</span>
                        </div>
                      )}
                      {form.getValues('production.maturation.maturationTimeMonths') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Maturation: {form.getValues('production.maturation.maturationTimeMonths')} months</span>
                        </div>
                      )}
                      {!form.getValues('production.maturation.barrelType') && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="w-3 h-3 border border-gray-300 rounded-full" />
                          <span>No production data yet</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Distribution & End-of-Life</h4>
                    <div className="space-y-1 text-xs">
                      {form.getValues('distribution.averageTransportDistance') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Transport: {form.getValues('distribution.averageTransportDistance')}km</span>
                        </div>
                      )}
                      {form.getValues('endOfLife.recyclingRate') && (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" />
                          <span>Recycling: {form.getValues('endOfLife.recyclingRate')}%</span>
                        </div>
                      )}
                      {!form.getValues('distribution.averageTransportDistance') && !form.getValues('endOfLife.recyclingRate') && (
                        <div className="flex items-center gap-1 text-gray-500">
                          <span className="w-3 h-3 border border-gray-300 rounded-full" />
                          <span>No distribution data yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-100 rounded-lg">
                  <p className="text-sm text-green-800">
                    <strong>💡 Auto-Fill Tip:</strong> Fields marked with 🔄 are automatically populated when you complete other tabs. 
                    Green highlighted fields show data synced from previous tabs. To modify these values, edit them in their source tabs.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Section 1: Agriculture & Raw Materials */}
            <Card data-testid="agriculture-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wheat className="w-5 h-5 text-avallen-green" />
                  Agriculture & Raw Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.agriculture.mainCropType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          Main Crop Type
                          <HelpBubble 
                            title="Main Crop Type"
                            content="The primary agricultural ingredient that forms the base of your product. This is crucial for LCA calculations as different crops have vastly different environmental impacts.<br><br><strong>Examples:</strong><br>• <strong>Spirits:</strong> Barley, wheat, rye, corn<br>• <strong>Wine:</strong> Grapes (specify variety if known)<br>• <strong>Calvados/Brandy:</strong> Apples, pears<br>• <strong>Rum:</strong> Sugar cane<br><br><strong>Why it matters:</strong> Each crop has different:<br>• Water requirements<br>• Fertilizer needs<br>• Carbon sequestration potential<br>• Processing energy requirements"
                          />
                        </FormLabel>
                        <FormDescription className="text-xs text-muted-foreground">
                          {form.getValues('ingredients')?.length > 0 
                            ? `🔄 Auto-filled from Ingredients tab: ${form.getValues('ingredients')?.[0]?.name || 'Primary ingredient'}`
                            : 'Main agricultural ingredient used in this product'
                          }
                        </FormDescription>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Apples, Grapes, Barley" 
                            {...field}
                            className={form.getValues('ingredients')?.length > 0 ? "bg-green-50 border-green-200" : ""}
                            name="lcaData.agriculture.mainCrop.cropType"
                          />
                        </FormControl>
                        {form.getValues('ingredients')?.length > 0 && (
                          <p className="text-xs text-green-600 mt-1">
                            ℹ️ This field is auto-filled from the Ingredients tab. To change, edit the primary ingredient there.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                </div>

                {/* OpenLCA Automation Status */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <h4 className="font-medium text-green-900">🤖 OpenLCA Automation Active</h4>
                      <p className="text-sm text-green-700 mt-1">
                        Manual agriculture data entry has been replaced with automated OpenLCA ecoinvent database calculations. 
                        All agriculture impact data is now calculated automatically from your ingredient selections.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Enhanced OpenLCA Information */}
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900">📊 Automated LCA Data Sources</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-blue-800">Agriculture & Raw Materials</h5>
                      <ul className="text-blue-700 mt-1 space-y-1 text-xs">
                        <li>• Yield calculations from ecoinvent database</li>
                        <li>• Diesel consumption by crop type & region</li>
                        <li>• Carbon sequestration rates (crop-specific)</li>
                        <li>• Fertilizer application rates (N, P, K)</li>
                        <li>• Farming practice impact factors</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-blue-800">Environmental Impact Coverage</h5>
                      <ul className="text-blue-700 mt-1 space-y-1 text-xs">
                        <li>• Land use efficiency metrics</li>
                        <li>• Water footprint calculations</li>
                        <li>• Biodiversity impact assessment</li>
                        <li>• Soil quality considerations</li>
                        <li>• 7-gas GHG impact modeling</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-blue-100 rounded border border-blue-300">
                    <p className="text-xs text-blue-800">
                      <strong>✓ ISO 14040/14044 Compliant:</strong> All calculations follow international LCA standards 
                      with full transparency and audit trail capabilities.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Inbound Transport */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Inbound Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.inboundTransport.distanceKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Distance (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="350" 
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
                    name="lcaData.inboundTransport.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="truck">Truck</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="ship">Ship</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
                            <SelectItem value="multimodal">Multimodal</SelectItem>
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
                    name="lcaData.inboundTransport.fuelEfficiencyLper100km"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fuel Efficiency (L/100km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="32.5" 
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
                    name="lcaData.inboundTransport.loadFactor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Load Factor (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="75" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="lcaData.inboundTransport.refrigerationRequired"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Refrigeration Required</FormLabel>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section 3: Processing & Production */}
            <Card data-testid="processing-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Factory className="w-5 h-5 text-avallen-green" />
                  Processing & Production
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Processing */}
                <div className="space-y-4">
                  <h4 className="font-medium">Basic Processing Data</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.waterM3PerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Water Usage (m³/ton crop)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="3.5" 
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
                      name="lcaData.processing.electricityKwhPerTonCrop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Electricity (kWh/ton crop)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="150" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.lpgKgPerLAlcohol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LPG Usage (kg/L alcohol)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.25" 
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
                      name="lcaData.processing.angelsSharePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Angel's Share (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="2.5" 
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
                      name="lcaData.processing.renewableEnergyPercent"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Renewable Energy (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="50.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Fermentation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Fermentation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.fermentationTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fermentation Time (days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="14" 
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
                      name="lcaData.processing.fermentation.yeastType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Yeast Type</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Wild, Commercial, House strain" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.temperatureControl"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Temperature Controlled</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.fermentation.sugarAddedKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Added Sugar (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Distillation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Distillation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.distillationRounds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Distillation Rounds</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="2" 
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
                      name="lcaData.processing.distillation.energySourceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Source</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select energy source" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="electric">Electric</SelectItem>
                              <SelectItem value="gas">Gas</SelectItem>
                              <SelectItem value="biomass">Biomass</SelectItem>
                              <SelectItem value="steam">Steam</SelectItem>
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
                      name="lcaData.processing.distillation.heatRecoverySystem"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Heat Recovery System</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.distillation.copperUsageKg"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Copper Usage (kg)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="500" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Maturation Sub-section */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Maturation Process</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.maturationTimeMonths"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maturation Time (months)</FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            {form.getValues('production.maturation.maturationTimeMonths') 
                              ? `🔄 Auto-filled from Production tab: ${form.getValues('production.maturation.maturationTimeMonths')} months`
                              : 'Duration of maturation affects evaporation and energy calculations'
                            }
                          </FormDescription>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="1"
                              placeholder="24" 
                              {...field} 
                              className={form.getValues('production.maturation.maturationTimeMonths') ? "bg-green-50 border-green-200" : ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          {form.getValues('production.maturation.maturationTimeMonths') && (
                            <p className="text-xs text-green-600 mt-1">
                              ℹ️ Auto-filled from Production tab. To change, edit the maturation time there.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.barrelType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Barrel Type</FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            {form.getValues('production.maturation.barrelType') 
                              ? `🔄 Auto-filled from Production tab: ${form.getValues('production.maturation.barrelType')}`
                              : 'Type of barrel used for maturation (affects CO2 calculations)'
                            }
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={form.getValues('production.maturation.barrelType') ? "bg-green-50 border-green-200" : ""}>
                                <SelectValue placeholder="Select barrel type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="new_oak">New Oak</SelectItem>
                              <SelectItem value="used_oak">Used Oak</SelectItem>
                              <SelectItem value="stainless_steel">Stainless Steel</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.getValues('production.maturation.barrelType') && (
                            <p className="text-xs text-green-600 mt-1">
                              ℹ️ Auto-filled from Production tab. To change, edit the maturation barrel type there.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.warehouseType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warehouse Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select warehouse type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="traditional">Traditional</SelectItem>
                              <SelectItem value="racked">Racked</SelectItem>
                              <SelectItem value="climate_controlled">Climate Controlled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.processing.maturation.evaporationLossPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evaporation Loss (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="0.1"
                              placeholder="2.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Enhanced Packaging Details */}
            <Card data-testid="packaging-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-avallen-green" />
                  Enhanced Packaging Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Container */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg" data-testid="container-details">
                  <h4 className="font-medium">Container Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material Type</FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            {form.getValues('packaging.primaryContainer.material') 
                              ? `🔄 Auto-filled from Packaging tab: ${form.getValues('packaging.primaryContainer.material')}`
                              : 'Primary container material for LCA calculations'
                            }
                          </FormDescription>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className={form.getValues('packaging.primaryContainer.material') ? "bg-green-50 border-green-200" : ""}>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="glass">Glass</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="aluminum">Aluminum</SelectItem>
                              <SelectItem value="steel">Steel</SelectItem>
                              <SelectItem value="ceramic">Ceramic</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                            </SelectContent>
                          </Select>
                          {form.getValues('packaging.primaryContainer.material') && (
                            <p className="text-xs text-green-600 mt-1">
                              ℹ️ This field is auto-filled from the Packaging tab. To change, edit the primary container material there.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Weight (grams)</FormLabel>
                          <FormDescription className="text-xs text-muted-foreground">
                            {form.getValues('packaging.primaryContainer.weight') 
                              ? `🔄 Auto-filled from Packaging tab: ${form.getValues('packaging.primaryContainer.weight')}g`
                              : 'Container weight for material impact calculations'
                            }
                          </FormDescription>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="500" 
                              {...field} 
                              className={form.getValues('packaging.primaryContainer.weight') ? "bg-green-50 border-green-200" : ""}
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          {form.getValues('packaging.primaryContainer.weight') && (
                            <p className="text-xs text-green-600 mt-1">
                              ℹ️ Auto-filled from Packaging tab. To change, edit the primary container weight there.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.container.recycledContentPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycled Content (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              max="100"
                              step="1"
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
                      name="lcaData.packagingDetailed.container.transportDistanceKm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transport Distance (km)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="200" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lcaData.packagingDetailed.container.manufacturingLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturing Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Barcelona, Spain" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Label */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Label Specifications</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select material" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="paper">Paper</SelectItem>
                              <SelectItem value="plastic">Plastic</SelectItem>
                              <SelectItem value="foil">Foil</SelectItem>
                              <SelectItem value="biodegradable">Biodegradable</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Label Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="3.5" 
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
                      name="lcaData.packagingDetailed.label.inkType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ink Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select ink type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="conventional">Conventional</SelectItem>
                              <SelectItem value="eco_friendly">Eco-Friendly</SelectItem>
                              <SelectItem value="soy_based">Soy-Based</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.label.adhesiveType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adhesive Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select adhesive" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="water_based">Water-Based</SelectItem>
                              <SelectItem value="solvent_based">Solvent-Based</SelectItem>
                              <SelectItem value="hot_melt">Hot Melt</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Closure */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Closure System</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.closure.materialType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Material</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select closure type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cork">Cork</SelectItem>
                              <SelectItem value="synthetic_cork">Synthetic Cork</SelectItem>
                              <SelectItem value="screw_cap">Screw Cap</SelectItem>
                              <SelectItem value="crown_cap">Crown Cap</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.packagingDetailed.closure.weightGrams"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Closure Weight (grams)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.1"
                              placeholder="2.5" 
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
                      name="lcaData.packagingDetailed.closure.hasLiner"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Has Liner</FormLabel>
                        </FormItem>
                      )}
                    />

                    {form.watch('lcaData.packagingDetailed.closure.hasLiner') && (
                      <FormField
                        control={form.control}
                        name="lcaData.packagingDetailed.closure.linerMaterial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Liner Material</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Saranex, PVdC" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Secondary Packaging */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Secondary Packaging</h4>
                  <FormField
                    control={form.control}
                    name="lcaData.packagingDetailed.secondaryPackaging.hasBox"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Uses Secondary Packaging</FormLabel>
                      </FormItem>
                    )}
                  />

                  {form.watch('lcaData.packagingDetailed.secondaryPackaging.hasBox') && (
                    <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.boxMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Material</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select material" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="cardboard">Cardboard</SelectItem>
                                  <SelectItem value="wood">Wood</SelectItem>
                                  <SelectItem value="plastic">Plastic</SelectItem>
                                  <SelectItem value="metal">Metal</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.boxWeightGrams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Box Weight (grams)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="150" 
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
                          name="lcaData.packagingDetailed.secondaryPackaging.protectiveMaterial"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protective Material</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Foam, Bubble wrap, Paper" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="lcaData.packagingDetailed.secondaryPackaging.protectiveMaterialWeightGrams"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Protective Material Weight (grams)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.1"
                                  placeholder="25" 
                                  {...field} 
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
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

            {/* Section 5: Distribution & Transport */}
            <Card data-testid="distribution-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-avallen-green" />
                  Distribution & Transport
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.distribution.avgDistanceToDcKm"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Average Distance to DC (km)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.1"
                            placeholder="450" 
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
                    name="lcaData.distribution.primaryTransportMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Transport Mode</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select transport mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="truck">Truck</SelectItem>
                            <SelectItem value="rail">Rail</SelectItem>
                            <SelectItem value="ship">Ship</SelectItem>
                            <SelectItem value="air">Air</SelectItem>
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
                    name="lcaData.distribution.palletizationEfficiency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Palletization Efficiency (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="85" 
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
                    name="lcaData.distribution.coldChainRequirement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel>Cold Chain Required</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch('lcaData.distribution.coldChainRequirement') && (
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium">Temperature Requirements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lcaData.distribution.temperatureRangeCelsius.min"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="2" 
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
                        name="lcaData.distribution.temperatureRangeCelsius.max"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum Temperature (°C)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="8" 
                                {...field} 
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section 6: End of Life Details */}
            <Card data-testid="endoflife-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Recycle className="w-5 h-5 text-avallen-green" />
                  End of Life Management (Detailed)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="lcaData.endOfLifeDetailed.recyclingRatePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recycling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="75" 
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
                    name="lcaData.endOfLifeDetailed.primaryDisposalMethod"
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

                {/* Container Recyclability */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Container Recyclability</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.containerRecyclability.isRecyclable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Container is Recyclable</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.containerRecyclability.recyclingInfrastructureAvailable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Recycling Infrastructure Available</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="lcaData.endOfLifeDetailed.containerRecyclability.contaminationRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contamination Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100"
                            step="1"
                            placeholder="15" 
                            {...field} 
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Consumer Programs */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Consumer Programs</h4>
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.labelRemovalRequired"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Label Removal Required for Recycling</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.consumerEducationProgram"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Consumer Education Program</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lcaData.endOfLifeDetailed.takeback_program"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Take-back Program Available</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
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
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endOfLife.recyclingRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recycling Rate (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="85" 
                            min="0" 
                            max="100"
                            {...field} 
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                              form.setValue('lcaData.endOfLifeDetailed.recyclingRatePercentage', parseFloat(e.target.value) || 0);
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="endOfLife.returnableContainer"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(value) => {
                              field.onChange(value);
                              form.setValue('lcaData.endOfLifeDetailed.takeback_program', Boolean(value));
                            }}
                          />
                        </FormControl>
                        <FormLabel>Returnable container system</FormLabel>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="endOfLife.disposalMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Disposal Method</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue('lcaData.endOfLifeDetailed.primaryDisposalMethod', value as any);
                        }} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select disposal method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="recycling">Recycling</SelectItem>
                            <SelectItem value="composting">Composting</SelectItem>
                            <SelectItem value="energy-recovery">Energy Recovery</SelectItem>
                            <SelectItem value="landfill">Landfill</SelectItem>
                            <SelectItem value="reuse">Reuse</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                <FormField
                  control={form.control}
                  name="endOfLife.consumerEducation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consumer Education Initiatives</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your consumer education programs for proper disposal..." 
                          rows={3}
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e.target.value);
                            form.setValue('lcaData.endOfLifeDetailed.consumerEducationProgram', Boolean(e.target.value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>

                {/* Enhanced Biodegradability Assessment */}
                <div className="bg-green-50 p-4 rounded-lg space-y-4">
                  <h5 className="font-medium text-green-900">Biodegradability Assessment</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.organic"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Organic biodegradable</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.composting"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Industrial composting</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endOfLife.biodegradability.marineBiodegradable"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Marine biodegradable</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* LCA End-of-Life Breakdown */}
                <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                  <h5 className="font-medium text-blue-900">LCA End-of-Life Breakdown</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="endOfLife.lcaEndOfLife.recyclingRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Recycling Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="75.0" 
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
                      name="endOfLife.lcaEndOfLife.energyRecoveryRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Energy Recovery Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="15.0" 
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
                      name="endOfLife.lcaEndOfLife.landfillRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Landfill Rate (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="10.0" 
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
                      name="endOfLife.lcaEndOfLife.sortingEfficiency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sorting Efficiency (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="85.0" 
                              {...field} 
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Take-back Programs */}
                <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                  <h5 className="font-medium text-purple-900">Take-back Programs</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="endOfLife.takeback.takebackProgram"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Take-back program available</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endOfLife.takeback.refillProgram"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel>Refill program available</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="endOfLife.takeback.returnIncentive"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Return Incentive</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g. £0.10 deposit, 5% discount on next purchase" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="text-sm text-green-600 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Auto-syncing to LCA Data tab
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Submit Button */}
          <div className="flex justify-between pt-6">
            <div className="text-sm text-gray-500">
              Tab {activeTab === 'basic' ? '1' : activeTab === 'ingredients' ? '2' : activeTab === 'packaging' ? '3' : activeTab === 'production' ? '4' : activeTab === 'certifications' ? '5' : activeTab === 'distribution' ? '6' : activeTab === 'endoflife' ? '7' : '8'} of 8
            </div>
            
            <div className="flex gap-3">
              {onSaveDraft && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={isDraftSaving}
                  className="text-gray-600 border-gray-300"
                >
                  {isDraftSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving Draft...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Draft
                    </>
                  )}
                </Button>
              )}

              {/* LCA Calculate Button - Only show when editing existing product */}
              {isEditing && productId && activeTab === 'lcadata' && (
                <Button 
                  type="button"
                  onClick={handleCalculateLCA}
                  disabled={lcaStatus === 'calculating' || startLcaCalculation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  variant="default"
                >
                  {lcaStatus === 'calculating' || startLcaCalculation.isPending ? (
                    <>
                      <Activity className="w-4 h-4 mr-2 animate-pulse" />
                      Calculating... {lcaProgress}%
                    </>
                  ) : lcaStatus === 'completed' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      LCA Complete
                    </>
                  ) : lcaStatus === 'failed' ? (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Retry LCA
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate LCA
                    </>
                  )}
                </Button>
              )}
              
              {activeTab !== 'basic' && (
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'certifications', 'distribution', 'endoflife', 'lcadata'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                  }}
                >
                  Previous
                </Button>
              )}
              
              {activeTab !== 'lcadata' ? (
                <Button 
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const tabs = ['basic', 'ingredients', 'packaging', 'production', 'certifications', 'distribution', 'endoflife', 'lcadata'];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#209d50] hover:bg-[#1a8442] text-white"
                  onClick={(e) => {
                    console.log('🔘 Submit button clicked!');
                    console.log('🔍 Form errors:', form.formState.errors);
                    console.log('🔍 Form valid:', form.formState.isValid);
                    console.log('🔍 Form values sample:', {
                      name: form.getValues('name'),
                      sku: form.getValues('sku'),
                      type: form.getValues('type')
                    });
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isEditing ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {isEditing ? 'Update Product' : 'Create Product'}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Tabs>
      </form>
    </Form>
    </TourProvider>
  );
}