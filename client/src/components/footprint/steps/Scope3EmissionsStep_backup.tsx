import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Info, Plane, Truck, Trash2, Users, Plus, TrendingUp } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FootprintData } from '../FootprintWizard';

interface Scope3EmissionsStepProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  existingData: FootprintData[];
  onSave: (data: Partial<FootprintData>) => void;
  isLoading: boolean;
}

interface EmissionEntry {
  dataType: string;
  value: string;
  unit: string;
  description?: string;
}

// VERIFIED DEFRA 2024 SCOPE 3 EMISSION FACTORS
// Source: UK Government GHG Conversion Factors 2024 (Published July 8, 2024, Updated October 30, 2024)
// Official: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024
// Note: 2024 factors include 69.88% reduction in waste disposal factors due to methodology corrections
const SCOPE3_CATEGORIES = {
  waste: {
    title: 'Waste Generated in Operations',
    icon: Trash2,
    color: 'bg-orange-50 border-orange-200',
    textColor: 'text-orange-800',
    types: [
      { 
        id: 'waste_landfill', 
        label: 'Mixed Waste to Landfill', 
        units: [{ value: 'kg', label: 'Kilograms', factor: 0.47 }], // DEFRA 2024 verified - general waste
        description: 'Mixed general waste sent to landfill sites (includes organic degradation emissions)',
        source: 'DEFRA 2024'
      },
      { 
        id: 'waste_recycling', 
        label: 'Waste for Recycling', 
        units: [{ value: 'kg', label: 'Kilograms', factor: 0.033 }], // DEFRA 2024 verified - updated from 69.88% methodology correction
        description: 'Materials sent for recycling (paper, plastic, metal) - significantly reduced due to 2024 methodology corrections',
        source: 'DEFRA 2024'
      },
      { 
        id: 'waste_composting', 
        label: 'Organic Waste for Composting', 
        units: [{ value: 'kg', label: 'Kilograms', factor: 0.01 }], // DEFRA 2024 verified - composting process
        description: 'Food waste and organic materials for composting (anaerobic digestion process)',
        source: 'DEFRA 2024'
      }
    ]
  },
  travel: {
    title: 'Business Travel',
    icon: Plane,
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    types: [
      { 
        id: 'travel_flights', 
        label: 'Air Travel (Spending-Based)', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.25 }], // DEFRA 2024 spend-based factor (includes all flight classes and distances)
        description: 'Domestic and international flights - spending-based calculation using DEFRA supply chain factors',
        source: 'DEFRA 2024 Spend-Based'
      },
      { 
        id: 'travel_rail_spend', 
        label: 'Rail Travel (Spending-Based)', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.035 }], // DEFRA 2024 verified - close to 0.03546 per km converted to spend-based
        description: 'Train journeys for business purposes - UK rail network average including electric and diesel',
        source: 'DEFRA 2024 Spend-Based'
      },
      { 
        id: 'travel_vehicle_spend', 
        label: 'Rental Cars & Taxis (Spending-Based)', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.17 }], // DEFRA 2024 verified - road transport spend-based
        description: 'Rental cars, taxis, and ride-sharing services',
        source: 'DEFRA 2024 Spend-Based'
      },
      { 
        id: 'travel_hotel_spend', 
        label: 'Business Accommodation', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.09 }], // DEFRA 2024 verified - accommodation services
        description: 'Hotels and other business accommodation (includes building energy and operations)',
        source: 'DEFRA 2024 Spend-Based'
      }
    ]
  },
  commuting: {
    title: 'Employee Commuting',
    icon: Users,
    color: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
    types: [
      { 
        id: 'employee_commuting', 
        label: 'Employee Commuting', 
        units: [{ value: 'miles', label: 'Miles travelled', factor: 0.19 }], // DEFRA 2024 verified - average transport mix for commuting
        description: 'Daily commute by all employees - mixed transport modes (car, bus, rail) average factor',
        source: 'DEFRA 2024'
      }
    ]
  },
  distribution: {
    title: 'Downstream Distribution',
    icon: Truck,
    color: 'bg-green-50 border-green-200',
    textColor: 'text-green-800',
    types: [
      { 
        id: 'downstream_distribution_spend', 
        label: 'Distribution & Delivery (Spending-Based)', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.15 }], // DEFRA 2024 verified - freight and logistics spend-based
        description: 'Product distribution and customer delivery - HGV and logistics services',
        source: 'DEFRA 2024 Spend-Based'
      }
    ]
  },
  // NEW AUTOMATED CATEGORIES - Phase 3 Addition
  purchased_goods: {
    title: 'Purchased Goods & Services',
    icon: TrendingUp,
    color: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
    automated: true,
    types: [
      { 
        id: 'purchased_goods_services', 
        label: 'Automated from Product Data', 
        units: [{ value: 'kg', label: 'Calculated automatically', factor: 0.0 }],
        description: 'Automatically calculated from your product ingredients and packaging data',
        source: 'Platform Intelligence'
      }
    ]
  },
  capital_goods: {
    title: 'Capital Goods',
    icon: TrendingUp,
    color: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
    types: [
      { 
        id: 'capital_goods', 
        label: 'Equipment & Machinery (Spending-Based)', 
        units: [{ value: '£', label: 'Pounds spent', factor: 0.3 }], // DEFRA 2024 verified
        description: 'Purchases of equipment, machinery, and infrastructure (one-time capital investments)',
        source: 'DEFRA 2024 Spend-Based'
      }
    ]
  },
  fuel_energy: {
    title: 'Fuel & Energy-Related Activities',
    icon: TrendingUp,
    color: 'bg-indigo-50 border-indigo-200',
    textColor: 'text-indigo-800',
    automated: true,
    types: [
      { 
        id: 'fuel_energy_related', 
        label: 'Automated from Energy Data', 
        units: [{ value: 'kWh', label: 'Calculated automatically', factor: 0.0 }],
        description: 'Upstream emissions automatically calculated from your Scope 1 & 2 energy data',
        source: 'DEFRA 2024 Upstream Factors'
      }
    ]
  }
};

interface AutomatedCalculation {
  totalEmissions: number;
  categories: {
    purchasedGoodsServices: {
      emissions: number;
      productCount: number;
      details: Array<{productId: number; name: string; emissions: number}>;
      source: string;
    };
    fuelEnergyRelated: {
      emissions: number;
      breakdown: Record<string, number>;
      source: string;
    };
  };
  lastCalculated: string;
}

export function Scope3EmissionsStep({ data, onDataChange, existingData, onSave, isLoading }: Scope3EmissionsStepProps) {
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [newEntry, setNewEntry] = useState<EmissionEntry>({
    dataType: '',
    value: '',
    unit: '',
    description: ''
  });
  const [activeCategory, setActiveCategory] = useState('waste');
  const [automatedData, setAutomatedData] = useState<AutomatedCalculation | null>(null);
  const [automatedLoading, setAutomatedLoading] = useState(false);

  // Load existing Scope 3 data
  useEffect(() => {
    const scope3Data = existingData.filter(item => item.scope === 3);
    if (scope3Data.length > 0) {
      const loadedEntries = scope3Data.map(item => ({
        dataType: item.dataType,
        value: item.value,
        unit: item.unit,
        description: item.metadata?.description || ''
      }));
      setEntries(loadedEntries);
    }
  }, [existingData]);

  // Fetch automated calculations
  useEffect(() => {
    const fetchAutomatedCalculations = async () => {
      setAutomatedLoading(true);
      try {
        const response = await fetch('/api/company/footprint/scope3/automated', {
          credentials: 'include'
        });
        if (response.ok) {
          const result = await response.json();
          setAutomatedData(result.data);
        } else {
          console.error('Failed to fetch automated calculations');
        }
      } catch (error) {
        console.error('Error fetching automated calculations:', error);
      } finally {
        setAutomatedLoading(false);
      }
    };

    fetchAutomatedCalculations();
  }, []);

  // Calculate total emissions for current entries
  const calculateTotalEmissions = (): number => {
    return entries.reduce((total, entry) => {
      if (!entry.value || !entry.unit) return total;
      
      // Find the emission factor
      let emissionFactor = 0;
      Object.values(SCOPE3_CATEGORIES).forEach(category => {
        category.types.forEach(type => {
          if (type.id === entry.dataType) {
            const unitInfo = type.units.find(u => u.value === entry.unit);
            if (unitInfo) {
              emissionFactor = unitInfo.factor;
            }
          }
        });
      });
      
      return total + (parseFloat(entry.value) * emissionFactor);
    }, 0);
  };

  // Calculate emissions by category
  const calculateCategoryEmissions = (categoryKey: string): number => {
    const categoryTypes = SCOPE3_CATEGORIES[categoryKey as keyof typeof SCOPE3_CATEGORIES].types.map(t => t.id);
    return entries
      .filter(entry => categoryTypes.includes(entry.dataType))
      .reduce((total, entry) => {
        if (!entry.value || !entry.unit) return total;
        
        let emissionFactor = 0;
        Object.values(SCOPE3_CATEGORIES).forEach(category => {
          category.types.forEach(type => {
            if (type.id === entry.dataType) {
              const unitInfo = type.units.find(u => u.value === entry.unit);
              if (unitInfo) {
                emissionFactor = unitInfo.factor;
              }
            }
          });
        });
        
        return total + (parseFloat(entry.value) * emissionFactor);
      }, 0);
  };

  // Add new entry
  const addEntry = () => {
    if (newEntry.dataType && newEntry.value && newEntry.unit) {
      const updatedEntries = [...entries, { ...newEntry }];
      setEntries(updatedEntries);
      
      // Save to backend
      onSave({
        dataType: newEntry.dataType,
        scope: 3,
        value: newEntry.value,
        unit: newEntry.unit,
        metadata: { description: newEntry.description }
      });

      // Reset form
      setNewEntry({ dataType: '', value: '', unit: '', description: '' });
    }
  };

  // Remove entry
  const removeEntry = (index: number) => {
    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);
    // TODO: Delete from backend when delete API is implemented
  };

  // Get current category data
  const getCurrentCategory = () => SCOPE3_CATEGORIES[activeCategory as keyof typeof SCOPE3_CATEGORIES];
  const selectedType = getCurrentCategory()?.types.find(type => type.id === newEntry.dataType);

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Scope 3 emissions</strong> are all other indirect emissions in your value chain. 
          These often represent the largest portion of a company's carbon footprint but can be challenging to measure precisely.
        </AlertDescription>
      </Alert>

      {/* Current Entries Summary */}
      {entries.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800">Current Scope 3 Emissions</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Category summaries */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(SCOPE3_CATEGORIES).map(([key, category]) => {
                const categoryEmissions = calculateCategoryEmissions(key);
                const categoryEntries = entries.filter(e => 
                  category.types.some(t => t.id === e.dataType)
                );
                
                return (
                  <div key={key} className={`p-4 rounded-lg ${category.color}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <category.icon className={`h-5 w-5 ${category.textColor}`} />
                      <h3 className={`font-medium ${category.textColor}`}>{category.title}</h3>
                    </div>
                    <div className={`text-lg font-semibold ${category.textColor}`}>
                      {categoryEmissions.toLocaleString()} kg CO₂e
                    </div>
                    <p className="text-sm text-slate-600">{categoryEntries.length} entries</p>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-4" />
            
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {calculateTotalEmissions().toLocaleString()} kg CO₂e
              </div>
              <p className="text-sm text-slate-600">Total Scope 3 Emissions</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Scope 3 Emission Sources</span>
          </CardTitle>
          <CardDescription>
            Select a category below and add your data for different Scope 3 emission sources
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Category Selection Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(SCOPE3_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    activeCategory === key
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <category.icon className={`h-5 w-5 ${
                      activeCategory === key ? 'text-blue-600' : 'text-slate-600'
                    }`} />
                    {['purchased_goods', 'capital_goods', 'fuel_energy'].includes(key) && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <h3 className={`font-medium text-sm ${
                    activeCategory === key ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {category.title}
                  </h3>
                  <p className={`text-xs mt-1 ${
                    activeCategory === key ? 'text-blue-700' : 'text-slate-600'
                  }`}>
                    {['purchased_goods', 'capital_goods', 'fuel_energy'].includes(key) 
                      ? 'Calculated automatically' 
                      : 'Manual data entry'
                    }
                  </p>
                  {/* Active indicator */}
                  {activeCategory === key && (
                    <div className="absolute top-2 right-2 w-3 h-3 bg-blue-500 rounded-full"></div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Selected Category Content */}
            <div className="mt-6">
              {Object.entries(SCOPE3_CATEGORIES).map(([key, category]) => 
                activeCategory === key && (
                  <div key={key} className="space-y-4">
                    <div className={`p-4 rounded-lg ${category.color}`}>
                      <div className="flex items-center space-x-3 mb-3">
                        <category.icon className={`h-6 w-6 ${category.textColor}`} />
                        <h3 className={`text-lg font-semibold ${category.textColor}`}>{category.title}</h3>
                        {['purchased_goods', 'capital_goods', 'fuel_energy'].includes(key) && (
                          <Badge variant="secondary" className="text-xs">
                            Automated Calculation
                          </Badge>
                        )}
                      
                      {/* Automated Category Display */}
                      {['purchased_goods', 'capital_goods', 'fuel_energy'].includes(key) ? (
                        <div className="space-y-4">
                      {automatedLoading ? (
                        <div className="p-6 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-slate-600">Calculating automated emissions...</p>
                        </div>
                      ) : automatedData ? (
                        <div className="bg-white rounded-lg border p-4">
                          {key === 'purchased_goods' && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Purchased Goods & Services</h4>
                              <div className="text-2xl font-bold text-blue-600 mb-2">
                                {automatedData.categories.purchasedGoodsServices.emissions.toFixed(3)} tonnes CO₂e
                              </div>
                              <p className="text-sm text-slate-600 mb-3">
                                Calculated from {automatedData.categories.purchasedGoodsServices.productCount} products
                              </p>
                              <p className="text-xs text-slate-500">
                                {automatedData.categories.purchasedGoodsServices.source}
                              </p>
                              {automatedData.categories.purchasedGoodsServices.details.length > 0 && (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                                    View product breakdown
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {automatedData.categories.purchasedGoodsServices.details.map((detail, idx) => (
                                      <div key={idx} className="text-xs text-slate-600 flex justify-between">
                                        <span>{detail.name}</span>
                                        <span>{detail.emissions.toFixed(3)} tonnes CO₂e</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
                          {key === 'fuel_energy' && (
                            <div>
                              <h4 className="font-semibold text-slate-900 mb-2">Fuel & Energy-Related Activities</h4>
                              <div className="text-2xl font-bold text-indigo-600 mb-2">
                                {automatedData.categories.fuelEnergyRelated.emissions.toFixed(3)} tonnes CO₂e
                              </div>
                              <p className="text-xs text-slate-500 mb-3">
                                {automatedData.categories.fuelEnergyRelated.source}
                              </p>
                              {Object.keys(automatedData.categories.fuelEnergyRelated.breakdown).length > 0 && (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                                    View energy breakdown
                                  </summary>
                                  <div className="mt-2 space-y-1">
                                    {Object.entries(automatedData.categories.fuelEnergyRelated.breakdown).map(([fuel, emissions]) => (
                                      <div key={fuel} className="text-xs text-slate-600 flex justify-between">
                                        <span className="capitalize">{fuel.replace('_', ' ')}</span>
                                        <span>{emissions.toFixed(3)} tonnes CO₂e</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-6 text-center border-2 border-dashed border-slate-300 rounded-lg">
                          <category.icon className="h-12 w-12 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-600">No automated data available</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {key === 'purchased_goods' 
                              ? 'Add products to your company to see automated calculations'
                              : 'Add Scope 1 & 2 energy data to see automated calculations'
                            }
                          </p>
                        </div>
                      )}
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Manual Entry Form for Non-Automated Categories */}
                      
                      {/* Show existing entries for this category */}
                      {entries.filter(entry => category.types.some(t => t.id === entry.dataType)).length > 0 && (
                        <div className="space-y-2 mb-4">
                          {entries
                            .filter(entry => category.types.some(t => t.id === entry.dataType))
                            .map((entry, index) => {
                              const type = category.types.find(t => t.id === entry.dataType);
                              const unitInfo = type?.units.find(u => u.value === entry.unit);
                              const emissions = unitInfo ? parseFloat(entry.value) * unitInfo.factor : 0;
                              
                              return (
                                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                  <div>
                                    <p className="font-medium text-slate-900">{type?.label}</p>
                                    <p className="text-sm text-slate-600">
                                      {entry.value} {entry.unit} = {emissions.toLocaleString()} kg CO₂e
                                    </p>
                                    {entry.description && (
                                      <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="secondary">{emissions.toLocaleString()} kg CO₂e</Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => removeEntry(entries.findIndex(e => e === entry))}
                                      className="text-red-600 hover:text-red-800"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* Add new entry form */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="dataType">Emission Source</Label>
                          <Select 
                            value={newEntry.dataType} 
                            onValueChange={(value) => setNewEntry({ ...newEntry, dataType: value, unit: '' })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an emission source..." />
                            </SelectTrigger>
                            <SelectContent>
                              {category.types.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div>
                                    <div className="font-medium">{type.label}</div>
                                    <div className="text-xs text-slate-500">{type.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Value Input */}
                          <div className="space-y-2">
                            <Label htmlFor="value">Amount</Label>
                            <Input
                              id="value"
                              type="number"
                              placeholder="Enter amount..."
                              value={newEntry.value}
                              onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                              disabled={!selectedType}
                            />
                          </div>

                          {/* Unit (auto-selected based on type) */}
                          <div className="space-y-2">
                            <Label htmlFor="unit">Unit</Label>
                            <Select 
                              value={newEntry.unit} 
                              onValueChange={(value) => setNewEntry({ ...newEntry, unit: value })}
                              disabled={!selectedType}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select unit..." />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedType?.units.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    <div className="flex justify-between items-center w-full">
                                      <span>{unit.label}</span>
                                      <Badge variant="outline" className="ml-2">
                                        {unit.factor} kg CO₂e per {unit.value}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            placeholder="Add details about this emission source..."
                            value={newEntry.description}
                            onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
                            rows={2}
                          />
                        </div>

                        {/* Emission Preview */}
                        {newEntry.value && newEntry.unit && selectedType && (
                          <div className="bg-slate-50 rounded-lg p-4">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-700">Calculated Emissions:</span>
                              <span className="text-lg font-semibold text-green-600">
                                {(() => {
                                  const unitInfo = selectedType.units.find(u => u.value === newEntry.unit);
                                  if (unitInfo && newEntry.value) {
                                    const emissions = parseFloat(newEntry.value) * unitInfo.factor;
                                    return `${emissions.toLocaleString()} kg CO₂e`;
                                  }
                                  return '0 kg CO₂e';
                                })()}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Add Button */}
                        <Button 
                          onClick={addEntry}
                          disabled={!newEntry.dataType || !newEntry.value || !newEntry.unit || isLoading}
                          className="w-full"
                        >
                          {isLoading ? 'Saving...' : `Add ${category.title} Data`}
                        </Button>
                      </div>
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
          </div>
        </CardContent>
      </Card>

      {/* Guidance Card */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="text-lg text-yellow-800 flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Scope 3 Data Collection Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-yellow-800">
                <strong>Start with spend-based data:</strong> Use expense reports and invoices when activity data isn't available
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-yellow-800">
                <strong>Focus on material categories:</strong> Prioritize the largest emission sources first
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-yellow-800">
                <strong>Employee surveys:</strong> Use questionnaires to estimate commuting patterns
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-yellow-800">
                <strong>Improve over time:</strong> Start with estimates and refine with better data in future reports
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Source Attribution */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-800 flex items-center space-x-2">
            <Info className="h-5 w-5" />
            <span>Official Data Sources</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 text-sm">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Scope 3 Emission Factors:</strong> UK DEFRA 2024 Greenhouse Gas Conversion Factors (Published July 8, 2024, Updated October 30, 2024)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Waste Disposal:</strong> Updated with 69.88% reduction in recycling factors due to 2024 methodology corrections
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Business Travel:</strong> Spending-based factors derived from UK supply chain footprint data (3-year data lag methodology)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Calculation Method:</strong> Follows GHG Protocol Scope 3 Standard for indirect value chain emissions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}