import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Info, Flame, Car, Zap, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FootprintData } from '../FootprintWizard';

interface Scope1EmissionsStepProps {
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

const SCOPE1_DATA_TYPES = [
  { 
    id: 'natural_gas', 
    label: 'Natural Gas', 
    icon: Flame,
    units: [
      { value: 'm3', label: 'Cubic metres (m³)', factor: 2.03 },
      { value: 'kWh', label: 'Kilowatt hours (kWh)', factor: 0.18 }
    ],
    description: 'Gas used for heating, cooking, and industrial processes',
    examples: 'Monthly gas bills, meter readings'
  },
  { 
    id: 'heating_oil', 
    label: 'Heating Oil', 
    icon: Flame,
    units: [
      { value: 'litres', label: 'Litres', factor: 2.94 },
      { value: 'kg', label: 'Kilograms', factor: 3.15 }
    ],
    description: 'Oil used for heating buildings and facilities',
    examples: 'Fuel delivery receipts, storage tank measurements'
  },
  { 
    id: 'lpg', 
    label: 'LPG (Liquid Petroleum Gas)', 
    icon: Flame,
    units: [
      { value: 'litres', label: 'Litres', factor: 1.51 },
      { value: 'kg', label: 'Kilograms', factor: 2.98 }
    ],
    description: 'Propane and butane for heating, cooking, and forklifts',
    examples: 'Cylinder purchases, bulk tank deliveries'
  },
  { 
    id: 'petrol', 
    label: 'Petrol (Company Vehicles)', 
    icon: Car,
    units: [
      { value: 'litres', label: 'Litres', factor: 2.31 }
    ],
    description: 'Fuel for company-owned cars, vans, and light vehicles',
    examples: 'Fuel cards, expense receipts, mileage logs'
  },
  { 
    id: 'diesel', 
    label: 'Diesel (Company Vehicles)', 
    icon: Car,
    units: [
      { value: 'litres', label: 'Litres', factor: 2.65 }
    ],
    description: 'Fuel for company-owned trucks, generators, and equipment',
    examples: 'Fuel receipts, vehicle logs, generator usage'
  },
  { 
    id: 'refrigerant_gas', 
    label: 'Refrigerant Gas Leaks', 
    icon: Zap,
    units: [
      { value: 'kg', label: 'Kilograms leaked', factor: 1400 }
    ],
    description: 'Losses from air conditioning and refrigeration systems',
    examples: 'Service records, refrigerant top-ups, leak detection reports'
  }
];

export function Scope1EmissionsStep({ data, onDataChange, existingData, onSave, isLoading }: Scope1EmissionsStepProps) {
  const [entries, setEntries] = useState<EmissionEntry[]>([]);
  const [newEntry, setNewEntry] = useState<EmissionEntry>({
    dataType: '',
    value: '',
    unit: '',
    description: ''
  });

  // Load existing Scope 1 data
  useEffect(() => {
    const scope1Data = existingData.filter(item => item.scope === 1);
    if (scope1Data.length > 0) {
      const loadedEntries = scope1Data.map(item => ({
        dataType: item.dataType,
        value: item.value,
        unit: item.unit,
        description: item.metadata?.description || ''
      }));
      setEntries(loadedEntries);
    }
  }, [existingData]);

  // Calculate total emissions for current entries
  const calculateTotalEmissions = (): number => {
    return entries.reduce((total, entry) => {
      if (!entry.value || !entry.unit) return total;
      const dataType = SCOPE1_DATA_TYPES.find(type => type.id === entry.dataType);
      const unitInfo = dataType?.units.find(u => u.value === entry.unit);
      if (unitInfo) {
        return total + (parseFloat(entry.value) * unitInfo.factor);
      }
      return total;
    }, 0);
  };

  // Add new entry
  const addEntry = () => {
    if (newEntry.dataType && newEntry.value && newEntry.unit) {
      const updatedEntries = [...entries, { ...newEntry }];
      setEntries(updatedEntries);
      
      // Save to backend
      const dataType = SCOPE1_DATA_TYPES.find(type => type.id === newEntry.dataType);
      const unitInfo = dataType?.units.find(u => u.value === newEntry.unit);
      
      if (unitInfo) {
        onSave({
          dataType: newEntry.dataType,
          scope: 1,
          value: newEntry.value,
          unit: newEntry.unit,
          metadata: { description: newEntry.description }
        });
      }

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

  const selectedDataType = SCOPE1_DATA_TYPES.find(type => type.id === newEntry.dataType);

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Scope 1 emissions</strong> are direct emissions from sources owned or controlled by your company. 
          This includes fuel combustion in company vehicles, heating systems, and industrial processes, as well as refrigerant leaks.
        </AlertDescription>
      </Alert>

      {/* Current Entries Summary */}
      {entries.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800">Current Scope 1 Emissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {entries.map((entry, index) => {
                const dataType = SCOPE1_DATA_TYPES.find(type => type.id === entry.dataType);
                const unitInfo = dataType?.units.find(u => u.value === entry.unit);
                const emissions = unitInfo ? parseFloat(entry.value) * unitInfo.factor : 0;
                
                return (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                    <div className="flex items-center space-x-3">
                      {dataType?.icon && <dataType.icon className="h-5 w-5 text-slate-600" />}
                      <div>
                        <p className="font-medium text-slate-900">{dataType?.label}</p>
                        <p className="text-sm text-slate-600">
                          {entry.value} {entry.unit} = {emissions.toLocaleString()} kg CO₂e
                        </p>
                        {entry.description && (
                          <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{emissions.toLocaleString()} kg CO₂e</Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEntry(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-4" />
            
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">
                {calculateTotalEmissions().toLocaleString()} kg CO₂e
              </div>
              <p className="text-sm text-slate-600">Total Scope 1 Emissions</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Scope 1 Emission Source</span>
          </CardTitle>
          <CardDescription>
            Select the type of emission source and enter your consumption data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Data Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="dataType">Emission Source Type</Label>
            <Select value={newEntry.dataType} onValueChange={(value) => 
              setNewEntry({ ...newEntry, dataType: value, unit: '' })
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select an emission source..." />
              </SelectTrigger>
              <SelectContent>
                {SCOPE1_DATA_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex items-center space-x-2">
                      <type.icon className="h-4 w-4" />
                      <span>{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selected Type Info */}
          {selectedDataType && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium">{selectedDataType.description}</p>
                  <p className="text-sm mt-1">
                    <strong>Examples:</strong> {selectedDataType.examples}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Value Input */}
            <div className="space-y-2">
              <Label htmlFor="value">Consumption Amount</Label>
              <Input
                id="value"
                type="number"
                placeholder="Enter amount..."
                value={newEntry.value}
                onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
                disabled={!selectedDataType}
              />
            </div>

            {/* Unit Selection */}
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Select 
                value={newEntry.unit} 
                onValueChange={(value) => setNewEntry({ ...newEntry, unit: value })}
                disabled={!selectedDataType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit..." />
                </SelectTrigger>
                <SelectContent>
                  {selectedDataType?.units.map((unit) => (
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
              placeholder="Add any additional notes about this emission source..."
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Emission Preview */}
          {newEntry.value && newEntry.unit && selectedDataType && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-700">Calculated Emissions:</span>
                <span className="text-lg font-semibold text-green-600">
                  {(() => {
                    const unitInfo = selectedDataType.units.find(u => u.value === newEntry.unit);
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
            {isLoading ? 'Saving...' : 'Add Emission Source'}
          </Button>
        </CardContent>
      </Card>

      {/* Guidance Card */}
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle className="text-lg">Data Collection Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3">
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                <strong>Fuel Records:</strong> Check fuel cards, expense reports, and supplier invoices
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                <strong>Utility Bills:</strong> Look for gas and electricity bills with consumption data
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                <strong>Service Records:</strong> HVAC maintenance logs often include refrigerant top-up data
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                <strong>Reporting Period:</strong> Collect data for your full 12-month reporting period
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}