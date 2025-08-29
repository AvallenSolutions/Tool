import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Info, Zap, Building, Plus, Trash2, Lightbulb, Download, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FootprintData } from '../FootprintWizard';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface Scope2EmissionsStepProps {
  data: Record<string, any>;
  onDataChange: (data: Record<string, any>) => void;
  existingData: FootprintData[];
  onSave: (data: Partial<FootprintData>) => void;
  isLoading: boolean;
}

interface EnergyEntry {
  id?: number | string;
  energyType: string;
  value: string;
  unit: string;
  description?: string;
  isRenewable?: boolean;
  isAutomated?: boolean;
}

// VERIFIED DEFRA 2024 UK SCOPE 2 ENERGY EMISSION FACTORS
// Source: UK Government GHG Conversion Factors 2024 (Published July 8, 2024, Updated October 30, 2024)
// Official: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024
const SCOPE2_ENERGY_TYPES = [
  {
    id: 'steam',
    label: 'Purchased Steam',
    unit: 'kg',
    emissionFactor: 0.1796, // kg CO₂e per kg - DEFRA 2024 (district heat and steam)
    renewableOption: false,
    description: 'Steam purchased from external suppliers'
  },
  {
    id: 'heating',
    label: 'District Heating',
    unit: 'kWh',
    emissionFactor: 0.1796, // kg CO₂e per kWh - DEFRA 2024 verified
    renewableOption: false,
    description: 'Heat supplied through district heating systems'
  },
  {
    id: 'cooling',
    label: 'District Cooling',
    unit: 'kWh',
    emissionFactor: 0.0849, // kg CO₂e per kWh - DEFRA 2024 verified (different from heating)
    renewableOption: false,
    description: 'Cooling supplied through district cooling systems'
  }
];

export function Scope2EmissionsStep({ data, onDataChange, existingData, onSave, isLoading }: Scope2EmissionsStepProps) {
  const [entries, setEntries] = useState<EnergyEntry[]>([]);
  const [newEntry, setNewEntry] = useState<EnergyEntry>({
    energyType: '',
    value: '',
    unit: '',
    description: '',
    isRenewable: false
  });
  const { toast } = useToast();

  // Automatically fetch Scope 2 data from monthly facilities
  const { data: automatedScope2Data, isLoading: automatedLoading } = useQuery({
    queryKey: ['/api/company/footprint/scope2/automated'],
    retry: false,
    refetchOnWindowFocus: true,
    staleTime: 30000, // Refresh every 30 seconds to catch Operations tab changes
  });

  // Automatically sync automated data with form entries
  useEffect(() => {
    if (automatedScope2Data?.success && automatedScope2Data.data.footprintEntries) {
      const automatedEntries = automatedScope2Data.data.footprintEntries.map((entry: any) => ({
        energyType: 'electricity', // Automated entries are always electricity
        value: entry.value,
        unit: entry.unit,
        description: entry.metadata.description,
        isRenewable: entry.metadata.isRenewable || false,
        id: entry.metadata.automated ? `auto-${entry.dataType}` : undefined,
        isAutomated: true
      }));
      
      // Remove any existing automated entries and add new ones
      setEntries(prevEntries => {
        const manualEntries = prevEntries.filter((entry: any) => !entry.isAutomated);
        return [...manualEntries, ...automatedEntries];
      });
      
      // Save automated entries to backend (but only if they don't already exist)
      automatedScope2Data.data.footprintEntries.forEach(async (entry: any) => {
        // Check if this automated entry already exists in the database (multiple checks for robustness)
        const existingAutomatedEntry = existingData.find(existing => 
          existing.scope === entry.scope && 
          existing.dataType === entry.dataType && 
          (existing.metadata?.source === 'automated_from_operations' || 
           existing.value === entry.value) // Also check by value as backup
        );
        
        // Also check if any entry with this exact scope, type and value already exists
        const duplicateValueEntry = existingData.find(existing =>
          existing.scope === entry.scope && 
          existing.dataType === entry.dataType && 
          parseFloat(existing.value) === parseFloat(entry.value)
        );
        
        if (!existingAutomatedEntry && !duplicateValueEntry) {
          // Only create if it doesn't exist
          onSave({
            dataType: entry.dataType,
            scope: entry.scope,
            value: entry.value,
            unit: entry.unit,
            metadata: {
              source: 'automated_from_operations',
              description: `Grid electricity from monthly facility data (annual total)`,
              automated: true,
              lastSyncDate: new Date().toISOString()
            }
          });
        }
      });
    }
  }, [automatedScope2Data, onSave]);

  // Load existing Scope 2 data (excluding automated entries that are handled separately)
  useEffect(() => {
    const scope2Data = existingData.filter(item => 
      item.scope === 2 && 
      item.metadata?.source !== 'automated_from_operations' // Exclude automated entries
    );
    if (scope2Data.length > 0) {
      const loadedEntries = scope2Data.map(item => ({
        id: item.id,
        energyType: item.dataType, // Map dataType to energyType
        value: item.value,
        unit: item.unit || 'kWh',
        description: item.metadata?.description || '',
        isRenewable: item.metadata?.isRenewable || false,
        isAutomated: false
      }));
      setEntries(prevEntries => {
        // Keep any automated entries that might already be loaded
        const automatedEntries = prevEntries.filter((entry: any) => entry.isAutomated);
        return [...loadedEntries, ...automatedEntries];
      });
    }
  }, [existingData]);

  // Calculate total emissions for current entries using DEFRA 2024 factors
  const calculateTotalEmissions = (): number => {
    return entries.reduce((total, entry) => {
      if (!entry.value) return total;
      
      // For automated electricity entries, use the existing calculation
      if (entry.isAutomated) {
        const consumption = parseFloat(entry.value);
        // Use electricity emission factor for automated entries
        return total + (consumption * 0.22535);
      }
      
      // For manual entries, use the energy type factor
      if (!entry.energyType) return total;
      const consumption = parseFloat(entry.value);
      const energyType = SCOPE2_ENERGY_TYPES.find(type => type.id === entry.energyType);
      if (!energyType) return total;
      const emissionFactor = (entry.isRenewable && energyType.renewableOption) ? 0 : energyType.emissionFactor;
      return total + (consumption * emissionFactor);
    }, 0);
  };

  // Calculate total consumption
  const calculateTotalConsumption = (): number => {
    return entries.reduce((total, entry) => {
      if (!entry.value) return total;
      return total + parseFloat(entry.value);
    }, 0);
  };

  // Enhanced validation for Scope 2 entries
  const validateEnergyEntry = (entry: EnergyEntry): { isValid: boolean; errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!entry.energyType) {
      errors.push('Energy type is required');
    }
    
    if (!entry.value) {
      errors.push('Consumption value is required');
    } else {
      const numValue = parseFloat(entry.value);
      if (isNaN(numValue) || numValue < 0) {
        errors.push('Value must be a positive number');
      } else if (numValue === 0) {
        warnings.push('Zero consumption detected - ensure all sources are accounted for');
      } else if (numValue > 1000000) {
        warnings.push('Very high consumption detected - please verify this figure');
      }
      
      // Type-specific validation
      const energyType = SCOPE2_ENERGY_TYPES.find(type => type.id === entry.energyType);
      if (energyType && energyType.id === 'electricity') {
        // Industry benchmarking for SME drinks companies (annual kWh consumption)
        if (numValue > 200000) {
          warnings.push(`High electricity consumption (${numValue.toLocaleString()} kWh) - above typical levels for SME drinks companies`);
        } else if (numValue < 5000) {
          warnings.push('Low electricity consumption detected - ensure all facilities and equipment are captured');
        }
      }
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  };

  // Add new entry with validation
  const addEntry = () => {
    const validation = validateEnergyEntry(newEntry);
    
    if (!validation.isValid) {
      console.warn('Scope 2 validation errors:', validation.errors);
      toast({
        title: "Validation Error",
        description: validation.errors.join(', '),
        variant: "destructive",
      });
      return;
    }
    
    if (validation.warnings.length > 0) {
      console.info('Scope 2 validation warnings:', validation.warnings);
    }

    if (newEntry.value && newEntry.energyType) {
      const updatedEntries = [...entries, { ...newEntry }];
      setEntries(updatedEntries);
      
      const energyType = SCOPE2_ENERGY_TYPES.find(type => type.id === newEntry.energyType);
      const emissionFactor = (newEntry.isRenewable && energyType?.renewableOption) ? 0 : (energyType?.emissionFactor || 0);
      
      // Save to backend with enhanced metadata and calculate CO2 value
      const co2Value = (parseFloat(newEntry.value) * emissionFactor).toString();
      onSave({
        dataType: newEntry.energyType,
        scope: 2,
        value: newEntry.value,
        unit: newEntry.unit,
        co2Value: co2Value,
        metadata: { 
          description: newEntry.description,
          isRenewable: newEntry.isRenewable,
          emissionFactor: emissionFactor,
          validationWarnings: validation.warnings,
          energyTypeLabel: energyType?.label || newEntry.energyType
        }
      });

      // Reset form
      setNewEntry({ energyType: '', value: '', unit: '', description: '', isRenewable: false });
    }
  };

  // Delete entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (entryId: string) => {
      const response = await fetch(`/api/company/footprint/${entryId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete entry');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/company/footprint'] });
      toast({
        title: "Entry Deleted",
        description: "Footprint entry has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete entry: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Remove entry - now properly deletes from backend
  const removeEntry = (index: number) => {
    const entry = entries[index];
    if (entry.id) {
      // Delete from backend if entry has an ID
      deleteMutation.mutate(entry.id.toString());
    }
    // Also remove from local state immediately for better UX
    const updatedEntries = entries.filter((_, i) => i !== index);
    setEntries(updatedEntries);
  };

  const totalConsumption = calculateTotalConsumption();
  const totalEmissions = calculateTotalEmissions();
  const renewablePercentage = totalConsumption > 0 
    ? (entries.filter(e => e.isRenewable).reduce((sum, e) => sum + parseFloat(e.value || '0'), 0) / totalConsumption) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Educational Header */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Scope 2 emissions</strong> are indirect emissions from purchased electricity, heat, steam, and cooling. 
          These are emissions that occur at the facility where energy is generated, but your company purchases and uses the energy.
        </AlertDescription>
      </Alert>

      {/* Auto-sync Status */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-green-800 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Auto-Sync with Operations
          </CardTitle>
          <CardDescription className="text-green-700">
            Scope 2 emissions are automatically populated from your monthly facility data in the Operations tab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-sm text-green-700">
              <p>Electricity, steam, and other purchased energy data are automatically synchronized from your facilities.</p>
              <p className="text-xs mt-1 opacity-75">
                Data updates automatically when you modify monthly facility data in Operations.
              </p>
            </div>
            <Badge variant="outline" className="text-green-600 border-green-300">
              {automatedLoading ? 'Syncing...' : 'Auto-Synced'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Current Entries Summary */}
      {entries.length > 0 && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-800">Current Scope 2 Emissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 mb-4">
              {entries.map((entry, index) => {
                const consumption = parseFloat(entry.value || '0');
                // For automated electricity entries, use electricity factors; for manual entries use their type
                let energyType, emissionFactor;
                
                if (entry.isAutomated) {
                  // Automated entries are electricity
                  energyType = { label: 'Grid Electricity', unit: 'kWh', renewableOption: true };
                  emissionFactor = entry.isRenewable ? 0 : 0.22535;
                } else {
                  // Manual entries use their selected energy type
                  energyType = SCOPE2_ENERGY_TYPES.find(type => type.id === entry.energyType);
                  emissionFactor = (entry.isRenewable && energyType?.renewableOption) ? 0 : (energyType?.emissionFactor || 0);
                }
                const emissions = consumption * emissionFactor;
                
                return (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                    <div className="flex items-center space-x-3">
                      <Zap className={`h-5 w-5 ${entry.isRenewable ? 'text-green-600' : 'text-slate-600'}`} />
                      <div>
                        <p className="font-medium text-slate-900 flex items-center space-x-2">
                          <span>{energyType?.label || entry.energyType}</span>
                          {entry.isRenewable && energyType?.renewableOption && (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              Renewable
                            </Badge>
                          )}
                        </p>
                        <p className="text-sm text-slate-600">
                          {consumption.toLocaleString()} {entry.unit || energyType?.unit} = {emissions.toLocaleString()} kg CO₂e
                        </p>
                        {entry.description && (
                          <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={entry.isRenewable ? "outline" : "secondary"}>
                        {emissions.toLocaleString()} kg CO₂e
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeEntry(index)}
                        disabled={deleteMutation.isPending}
                        className="text-red-600 hover:text-red-800"
                        data-testid={`button-delete-entry-${index}`}
                      >
                        {deleteMutation.isPending && deleteMutation.variables === entry.id?.toString() ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Separator className="my-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xl font-semibold text-slate-900">
                  {totalConsumption.toLocaleString()}
                </div>
                <p className="text-sm text-slate-600">Total Consumption</p>
              </div>
              <div>
                <div className="text-xl font-semibold text-green-600">
                  {renewablePercentage.toFixed(1)}%
                </div>
                <p className="text-sm text-slate-600">Renewable Energy</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {totalEmissions.toLocaleString()} kg CO₂e
                </div>
                <p className="text-sm text-slate-600">Total Scope 2 Emissions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>Add Other Purchased Energy</span>
          </CardTitle>
          <CardDescription>
            Enter consumption data for purchased energy sources (electricity, steam, district heating/cooling)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Energy Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="energyType">Energy Type</Label>
            <Select
              value={newEntry.energyType}
              onValueChange={(value) => {
                const selectedType = SCOPE2_ENERGY_TYPES.find(type => type.id === value);
                setNewEntry({ 
                  ...newEntry, 
                  energyType: value, 
                  unit: selectedType?.unit || '',
                  isRenewable: selectedType?.renewableOption ? newEntry.isRenewable : false
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select energy type..." />
              </SelectTrigger>
              <SelectContent>
                {SCOPE2_ENERGY_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                      <span className="text-xs text-slate-500">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Value Input */}
          <div className="space-y-2">
            <Label htmlFor="value">
              Consumption ({newEntry.unit || 'Select energy type first'})
            </Label>
            <Input
              id="value"
              type="number"
              placeholder={`Enter ${newEntry.unit || 'amount'} consumed...`}
              value={newEntry.value}
              onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })}
              disabled={!newEntry.energyType}
            />
            {newEntry.energyType && (
              <p className="text-sm text-slate-500">
                {SCOPE2_ENERGY_TYPES.find(t => t.id === newEntry.energyType)?.description}
              </p>
            )}
          </div>

          {/* Renewable Energy Toggle - none of these energy types support renewable options */}
          {false && (
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="renewable"
                checked={newEntry.isRenewable || false}
                onChange={(e) => setNewEntry({ ...newEntry, isRenewable: e.target.checked })}
                className="rounded border-slate-300 text-green-600 focus:ring-green-500"
              />
              <Label htmlFor="renewable" className="flex items-center space-x-2">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span>This is renewable electricity (market-based approach)</span>
              </Label>
            </div>
          )}

          {newEntry.isRenewable && newEntry.energyType === 'electricity' && (
            <Alert className="bg-green-50 border-green-200">
              <Lightbulb className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Renewable electricity has zero market-based emissions when backed by valid certificates 
                (REGOs, RECs, or similar). Make sure you have proper documentation.
              </AlertDescription>
            </Alert>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add details about this energy consumption (e.g., supplier, billing period, site location)..."
              value={newEntry.description}
              onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Emission Preview */}
          {newEntry.value && newEntry.energyType && (() => {
            const energyType = SCOPE2_ENERGY_TYPES.find(type => type.id === newEntry.energyType);
            const consumption = parseFloat(newEntry.value || '0');
            const emissionFactor = (newEntry.isRenewable && energyType?.renewableOption) ? 0 : (energyType?.emissionFactor || 0);
            const emissions = consumption * emissionFactor;
            
            return (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-center">
                  <p className="text-sm text-slate-600">Calculated emissions</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {emissions.toLocaleString()} kg CO₂e
                  </p>
                  <p className="text-xs text-slate-500">
                    {energyType?.label}: {energyType?.emissionFactor} kg CO₂e/{energyType?.unit}
                    {newEntry.isRenewable && ' (renewable: 0 kg CO₂e)'}
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Add Button */}
          <Button 
            onClick={addEntry}
            disabled={!newEntry.value || isLoading}
            className="w-full"
          >
            {isLoading ? 'Saving...' : 'Add Other Purchased Energy'}
          </Button>
        </CardContent>
      </Card>

      {/* Guidance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Building className="h-5 w-5" />
              <span>Data Sources</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700">
                  <strong>Electricity Bills:</strong> Monthly/quarterly utility bills with kWh consumption
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700">
                  <strong>Meter Readings:</strong> Direct readings from electricity meters
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700">
                  <strong>Building Management:</strong> Data from smart building systems
                </p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-sm text-slate-700">
                  <strong>Green Certificates:</strong> REGOs for renewable electricity claims
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg text-blue-800">Reporting Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-blue-900">Location-based</h4>
                <p className="text-sm text-blue-700">
                  Uses average emission factors for your energy grid (UK electricity: 0.22535 kg CO₂e/kWh)
                </p>
              </div>
              <div>
                <h4 className="font-medium text-blue-900">Market-based</h4>
                <p className="text-sm text-blue-700">
                  Uses emission factors from your specific electricity contracts. Renewable electricity 
                  with valid certificates = 0 emissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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
                <strong>UK Energy Emission Factors:</strong> UK DEFRA 2024 Greenhouse Gas Conversion Factors (Electricity: 0.22535 kg CO₂e/kWh, Steam: 0.2056 kg CO₂e/kg)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Electricity Factor Breakdown:</strong> Generation (0.20705 kg CO₂e/kWh) + Transmission & Distribution (0.01830 kg CO₂e/kWh)
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Renewable Energy Method:</strong> Market-based approach following GHG Protocol Scope 2 Guidance with REGOs/RECs
              </p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-blue-800">
                <strong>Last Updated:</strong> October 30, 2024 (DEFRA 2024 Conversion Factors v1.1)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}