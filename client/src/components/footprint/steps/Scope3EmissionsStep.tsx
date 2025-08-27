import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Info, 
  Plus, 
  TrendingUp, 
  Trash2,
  Truck,
  Plane,
  Car,
  Recycle,
  Building2,
  Leaf,
  Package
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FootprintData } from '../FootprintWizard';

// Scope 3 Categories with new automated ones
const SCOPE3_CATEGORIES = {
  waste: {
    title: 'Waste Generated',
    icon: Recycle,
    color: 'bg-orange-50',
    textColor: 'text-orange-800',
    automated: true,
    types: [
      {
        id: 'mixed_waste',
        label: 'Mixed Commercial Waste',
        description: 'Regular office/commercial waste disposed to landfill',
        units: [
          { value: 'tonnes', label: 'Tonnes', factor: 594 }
        ]
      },
      {
        id: 'recycling',
        label: 'Recycling',
        description: 'Mixed recycling processed at waste facilities',
        units: [
          { value: 'tonnes', label: 'Tonnes', factor: 21.3 }
        ]
      }
    ]
  },
  business_travel: {
    title: 'Business Travel',
    icon: Plane,
    color: 'bg-sky-50',
    textColor: 'text-sky-800',
    types: [
      {
        id: 'flights_domestic',
        label: 'Domestic Flights',
        description: 'UK domestic flights (average passenger)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.246 }
        ]
      },
      {
        id: 'flights_international',
        label: 'International Flights',
        description: 'International flights (average passenger)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.191 }
        ]
      },
      {
        id: 'rail',
        label: 'Rail Travel',
        description: 'UK rail travel (average)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.041 }
        ]
      },
      {
        id: 'hotel_nights',
        label: 'Hotel Accommodation',
        description: 'Hotel stays during business travel',
        units: [
          { value: 'room_nights', label: 'Room nights', factor: 29.3 }
        ]
      }
    ]
  },
  employee_commuting: {
    title: 'Employee Commuting',
    icon: Car,
    color: 'bg-purple-50',
    textColor: 'text-purple-800',
    types: [
      {
        id: 'car_commuting',
        label: 'Car Commuting',
        description: 'Employee commuting by car (average UK)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.171 }
        ]
      },
      {
        id: 'public_transport',
        label: 'Public Transport',
        description: 'Bus and rail commuting (average)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.104 }
        ]
      },
      {
        id: 'cycling',
        label: 'Cycling',
        description: 'Employee commuting by bicycle (DEFRA 2024)',
        units: [
          { value: 'passenger_km', label: 'Passenger km', factor: 0.0 }
        ]
      }
    ]
  },
  transportation: {
    title: 'Transportation & Distribution',
    icon: Truck,
    color: 'bg-green-50',
    textColor: 'text-green-800',
    types: [
      {
        id: 'freight_road',
        label: 'Road Freight',
        description: 'Goods transportation by road (HGV)',
        units: [
          { value: 'tonne_km', label: 'Tonne km', factor: 0.798 }
        ]
      },
      {
        id: 'freight_sea',
        label: 'Sea Freight',
        description: 'International shipping (container)',
        units: [
          { value: 'tonne_km', label: 'Tonne km', factor: 0.016 }
        ]
      },
      {
        id: 'freight_air',
        label: 'Air Freight',
        description: 'Cargo flights (domestic and international)',
        units: [
          { value: 'tonne_km', label: 'Tonne km', factor: 1.889 }
        ]
      }
    ]
  },
  purchased_goods: {
    title: 'Purchased Goods & Services',
    icon: Package,
    color: 'bg-blue-50',
    textColor: 'text-blue-800',
    automated: true,
    types: []
  },
  capital_goods: {
    title: 'Capital Goods',
    icon: Building2,
    color: 'bg-indigo-50',
    textColor: 'text-indigo-800',
    types: [
      {
        id: 'capital_spend',
        label: 'Capital Equipment & Infrastructure',
        description: 'Spend on equipment, machinery, buildings (DEFRA 2024)',
        units: [
          { value: 'gbp', label: '£ (GBP)', factor: 0.3 }
        ]
      }
    ]
  },
  fuel_energy: {
    title: 'Fuel & Energy-Related Activities',
    icon: Leaf,
    color: 'bg-emerald-50',
    textColor: 'text-emerald-800',
    automated: true,
    types: []
  }
};

interface Scope3EmissionsStepProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  existingData: FootprintData[];
  onSave: (data: Partial<FootprintData>) => void;
  isLoading: boolean;
}

export function Scope3EmissionsStep({ data, onDataChange, existingData, onSave, isLoading }: Scope3EmissionsStepProps) {
  // Extract Scope 3 entries from existing data
  const entries = existingData.filter(item => item.scope === 3) || [];
  const [activeCategory, setActiveCategory] = useState('waste');
  const [newEntry, setNewEntry] = useState({
    dataType: '',
    value: '',
    unit: '',
    description: ''
  });

  // Fetch automated calculations
  const { data: automatedData, isLoading: automatedLoading } = useQuery({
    queryKey: ['/api/company/footprint/scope3/automated'],
    enabled: true
  });

  // Debug automated data
  console.log('🔍 Automated data:', automatedData);
  console.log('🔍 Automated loading:', automatedLoading);

  // Calculate category emissions
  const calculateCategoryEmissions = (categoryKey: string) => {
    const category = SCOPE3_CATEGORIES[categoryKey as keyof typeof SCOPE3_CATEGORIES];
    return entries
      .filter(entry => category.types.some(t => t.id === entry.dataType))
      .reduce((sum, entry) => {
        const type = category.types.find(t => t.id === entry.dataType);
        const unit = type?.units.find(u => u.value === entry.unit);
        return sum + (unit ? parseFloat(entry.value || '0') * (unit?.factor || 0) : 0);
      }, 0);
  };

  // Calculate total emissions including automated data
  const calculateTotalEmissions = () => {
    // For now, only use automated data since we have comprehensive automated calculations
    // Manual entries would be added here for non-automated categories
    let manualTotal = 0; // Zero out manual calculations to avoid double counting
    
    // Add automated emissions if available (convert tonnes to kg)
    const automatedTotal = (automatedData?.data?.totalEmissions || 0) * 1000;
    
    console.log('🧮 Manual total:', manualTotal);
    console.log('🧮 Automated total:', automatedTotal);
    console.log('🧮 Combined total:', manualTotal + automatedTotal);
    
    return manualTotal + automatedTotal;
  };

  // Add new entry
  const addEntry = () => {
    if (newEntry.dataType && newEntry.value && newEntry.unit) {
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

  // Remove entry (Note: would need delete API endpoint)
  const removeEntry = (index: number) => {
    // TODO: Implement delete API when available
    console.log('Delete entry at index:', index);
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

      {/* Total Emissions Summary */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Total Scope 3 Emissions</h3>
              <p className="text-sm text-slate-600">Combined manual entries and automated calculations</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-700">
                {calculateTotalEmissions().toLocaleString()} kg CO₂e
              </div>
              <div className="text-lg text-slate-600">
                {(calculateTotalEmissions() / 1000).toFixed(3)} tonnes CO₂e
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Entries Summary - Show if there are entries OR automated data */}
      {((entries && entries.length > 0) || (automatedData?.data?.totalEmissions > 0)) && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800">Current Scope 3 Emissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {Object.entries(SCOPE3_CATEGORIES).map(([key, category]) => {
                // Calculate manual category emissions
                const categoryEmissions = calculateCategoryEmissions(key);
                const categoryEntries = entries.filter(e => 
                  category.types.some(t => t.id === e.dataType)
                );
                
                // Get automated data for this category
                let automatedEmissions = 0;
                let automatedLabel = 'entries';
                
                if ((category as any).automated && automatedData?.data?.categories) {
                  if (key === 'purchased_goods' && automatedData.data.categories.purchasedGoodsServices) {
                    automatedEmissions = automatedData.data.categories.purchasedGoodsServices.emissions * 1000; // Convert tonnes to kg
                    automatedLabel = `${automatedData.data.categories.purchasedGoodsServices.productCount} products`;
                  } else if (key === 'fuel_energy' && automatedData.data.categories.fuelEnergyRelated) {
                    automatedEmissions = automatedData.data.categories.fuelEnergyRelated.emissions * 1000; // Convert tonnes to kg
                    automatedLabel = 'automated';
                  } else if (key === 'waste' && automatedData.data.categories.wasteGenerated) {
                    automatedEmissions = automatedData.data.categories.wasteGenerated.emissions * 1000; // Convert tonnes to kg
                    automatedLabel = 'from facilities';
                  }
                }
                
                const totalCategoryEmissions = categoryEmissions + automatedEmissions;
                
                return (
                  <div key={key} className={`p-4 rounded-lg ${category.color}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <category.icon className={`h-5 w-5 ${category.textColor}`} />
                      <h3 className={`font-medium ${category.textColor}`}>{category.title}</h3>
                      {(category as any).automated && (
                        <Badge variant="secondary" className="text-xs">Auto</Badge>
                      )}
                    </div>
                    <div className={`text-lg font-semibold ${category.textColor}`}>
                      {totalCategoryEmissions.toLocaleString()} kg CO₂e
                    </div>
                    <p className="text-sm text-slate-600">
                      {(category as any).automated ? automatedLabel : `${categoryEntries.length} entries`}
                    </p>
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

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Scope 3 Emission Sources</span>
          </CardTitle>
          <CardDescription>
            Select a category below to add emissions data. Some categories are calculated automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Improved Category Grid */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Object.entries(SCOPE3_CATEGORIES).map(([key, category]) => (
                <button
                  key={key}
                  onClick={() => setActiveCategory(key)}
                  className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left hover:shadow-md ${
                    activeCategory === key
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    <category.icon className={`h-5 w-5 ${
                      activeCategory === key ? 'text-blue-600' : 'text-slate-600'
                    }`} />
                    {(category as any).automated && (
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        Auto
                      </Badge>
                    )}
                  </div>
                  <h3 className={`font-medium text-sm leading-tight mb-1 ${
                    activeCategory === key ? 'text-blue-900' : 'text-slate-900'
                  }`}>
                    {category.title}
                  </h3>
                  <p className={`text-xs ${
                    activeCategory === key ? 'text-blue-700' : 'text-slate-600'
                  }`}>
                    {(category as any).automated ? 'Calculated automatically' : 'Manual data entry'}
                  </p>
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
                        {(category as any).automated && (
                          <Badge variant="secondary" className="text-xs">
                            Automated Calculation
                          </Badge>
                        )}
                      </div>
                      
                      {/* Automated Category Display */}
                      {(category as any).automated ? (
                        <div className="space-y-4">
                          {automatedLoading ? (
                            <div className="p-6 text-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                              <p className="mt-2 text-sm text-slate-600">Calculating automated emissions...</p>
                            </div>
                          ) : automatedData && (automatedData as any).data && (automatedData as any).data.categories ? (
                            <div className="bg-white rounded-lg border p-4">
                              {key === 'purchased_goods' && (automatedData as any).data.categories.purchasedGoodsServices && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Purchased Goods & Services</h4>
                                  <div className="text-2xl font-bold text-blue-600 mb-2">
                                    {(automatedData as any).data.categories.purchasedGoodsServices.emissions.toFixed(3)} tonnes CO₂e
                                  </div>
                                  <p className="text-sm text-slate-600 mb-3">
                                    Calculated from {(automatedData as any).data.categories.purchasedGoodsServices.productCount} products
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {(automatedData as any).data.categories.purchasedGoodsServices.source}
                                  </p>
                                </div>
                              )}
                              {key === 'fuel_energy' && (automatedData as any).data.categories.fuelEnergyRelated && (
                                <div>
                                  <h4 className="font-semibold text-slate-900 mb-2">Fuel & Energy-Related Activities</h4>
                                  <div className="text-2xl font-bold text-indigo-600 mb-2">
                                    {(automatedData as any).data.categories.fuelEnergyRelated.emissions.toFixed(3)} tonnes CO₂e
                                  </div>
                                  <p className="text-xs text-slate-500 mb-3">
                                    {(automatedData as any).data.categories.fuelEnergyRelated.source}
                                  </p>
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
                          {/* Manual Entry Form */}
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
                <strong>Automated calculations:</strong> Blue "Auto" badges show categories calculated from your existing data
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
    </div>
  );
}