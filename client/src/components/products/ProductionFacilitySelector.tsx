import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2, Factory, Zap, Droplets, Leaf, Target, ArrowRight, Info, Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

interface ProductionFacility {
  id: number;
  facilityName: string;
  facilityType: string;
  location: string;
  isPrimaryFacility: boolean;
  annualCapacityVolume: number;
  capacityUnit: string;
  averageUtilizationPercent: number;
  electricityKwhPerUnit?: number;
  gasM3PerUnit?: number;
  processWaterLitersPerUnit?: number;
  cleaningWaterLitersPerUnit?: number;
  organicWasteKgPerUnit?: number;
  renewableEnergyPercent?: number;
}

interface ProductionFacilitySelectorProps {
  selectedFacilityId?: number;
  onFacilitySelect: (facilityId: number | undefined) => void;
  onCreateFacility?: () => void;
}

export default function ProductionFacilitySelector({ 
  selectedFacilityId, 
  onFacilitySelect, 
  onCreateFacility 
}: ProductionFacilitySelectorProps) {
  const [selectedFacility, setSelectedFacility] = useState<ProductionFacility | null>(null);

  const { data: facilities, isLoading } = useQuery<ProductionFacility[]>({
    queryKey: ['/api/production-facilities'],
    retry: false,
  });

  // Update selected facility when selectedFacilityId changes
  useEffect(() => {
    if (selectedFacilityId && facilities) {
      const facility = facilities.find(f => f.id === selectedFacilityId);
      setSelectedFacility(facility || null);
    } else {
      setSelectedFacility(null);
    }
  }, [selectedFacilityId, facilities]);

  const handleFacilityChange = (facilityId: string) => {
    if (facilityId === "none") {
      setSelectedFacility(null);
      onFacilitySelect(undefined);
    } else {
      const facilityIdNum = parseInt(facilityId);
      const facility = facilities?.find(f => f.id === facilityIdNum);
      setSelectedFacility(facility || null);
      onFacilitySelect(facilityIdNum);
    }
  };

  const formatCapacity = (volume: number, unit: string) => {
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M ${unit}`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K ${unit}`;
    }
    return `${volume.toLocaleString()} ${unit}`;
  };

  const getFacilityTypeIcon = (type: string) => {
    switch (type) {
      case 'distillery': return <Factory className="w-4 h-4" />;
      case 'brewery': return <Factory className="w-4 h-4" />;
      case 'winery': return <Factory className="w-4 h-4" />;
      default: return <Building2 className="w-4 h-4" />;
    }
  };

  const getFacilityTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ');
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Facility Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Production Facility Selection
          </CardTitle>
          <CardDescription>
            Select the production facility for this product. All production metrics will be automatically applied from the facility's master data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label htmlFor="facility-select">Production Facility</Label>
              <Select value={selectedFacilityId?.toString() || "none"} onValueChange={handleFacilityChange}>
                <SelectTrigger id="facility-select">
                  <SelectValue placeholder="Select a production facility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No facility selected</SelectItem>
                  {facilities?.map((facility) => (
                    <SelectItem key={facility.id} value={facility.id.toString()}>
                      <div className="flex items-center gap-2">
                        {getFacilityTypeIcon(facility.facilityType)}
                        {facility.facilityName}
                        {facility.isPrimaryFacility && (
                          <Badge variant="outline" className="ml-2 text-xs">Primary</Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {onCreateFacility && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCreateFacility}
                className="mt-6"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Facility
              </Button>
            )}
          </div>

          {!facilities || facilities.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="font-medium text-gray-600 mb-2">No Production Facilities</h4>
              <p className="text-sm text-gray-500 mb-4">
                Create your first production facility to enable centralized production data management.
              </p>
              {onCreateFacility && (
                <Button 
                  type="button" 
                  onClick={onCreateFacility}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Facility
                </Button>
              )}
            </div>
          ) : selectedFacility ? (
            <div className="mt-4 p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Selected Facility</span>
              </div>
              <div className="text-sm text-green-700">
                {selectedFacility.facilityName} • {selectedFacility.location}
              </div>
            </div>
          ) : (
            <div className="mt-4 p-4 border border-gray-200 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-700">No Facility Selected</span>
              </div>
              <p className="text-sm text-gray-600">
                Select a production facility to automatically apply production metrics for LCA calculations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Facility Details - Show production metrics */}
      {selectedFacility && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-blue-600" />
              Production Metrics from {selectedFacility.facilityName}
            </CardTitle>
            <CardDescription>
              These production metrics will be automatically applied to your product's LCA calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Facility Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Facility Type</Label>
                <div className="flex items-center gap-2 text-sm">
                  {getFacilityTypeIcon(selectedFacility.facilityType)}
                  {getFacilityTypeLabel(selectedFacility.facilityType)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Location</Label>
                <div className="text-sm text-gray-600">{selectedFacility.location}</div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Annual Capacity</Label>
                <div className="text-sm text-gray-600">
                  {formatCapacity(selectedFacility.annualCapacityVolume, selectedFacility.capacityUnit)}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Utilization</Label>
                <div className="text-sm text-gray-600">{selectedFacility.averageUtilizationPercent}%</div>
              </div>
            </div>

            {/* Environmental Metrics */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-800 mb-4 flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-600" />
                Environmental Metrics (per unit)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Energy Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Zap className="w-4 h-4 text-yellow-600" />
                    Energy Consumption
                  </div>
                  
                  {selectedFacility.electricityKwhPerUnit !== undefined ? (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Electricity:</span> {selectedFacility.electricityKwhPerUnit} kWh
                      </div>
                      {selectedFacility.gasM3PerUnit && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Gas:</span> {selectedFacility.gasM3PerUnit} m³
                        </div>
                      )}
                      {selectedFacility.renewableEnergyPercent !== undefined && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Renewable:</span> {selectedFacility.renewableEnergyPercent}%
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Not configured</div>
                  )}
                </div>

                {/* Water Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Droplets className="w-4 h-4 text-blue-600" />
                    Water Usage
                  </div>
                  
                  {selectedFacility.processWaterLitersPerUnit !== undefined ? (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Process:</span> {selectedFacility.processWaterLitersPerUnit} L
                      </div>
                      {selectedFacility.cleaningWaterLitersPerUnit && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Cleaning:</span> {selectedFacility.cleaningWaterLitersPerUnit} L
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Not configured</div>
                  )}
                </div>

                {/* Waste Metrics */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Target className="w-4 h-4 text-purple-600" />
                    Waste Generation
                  </div>
                  
                  {selectedFacility.organicWasteKgPerUnit !== undefined ? (
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Organic:</span> {selectedFacility.organicWasteKgPerUnit} kg
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 italic">Not configured</div>
                  )}
                </div>
              </div>
            </div>

            {/* Integration Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">Automatic Integration</h4>
                  <p className="text-sm text-blue-800">
                    These production metrics are automatically integrated into your product's LCA calculations. 
                    Any updates to the facility's master data will be reflected in all associated products.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}