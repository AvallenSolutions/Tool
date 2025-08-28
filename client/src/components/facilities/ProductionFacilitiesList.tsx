import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Building2, Edit, Trash2, Zap, Droplets, Leaf, MapPin, Factory, Plus, AlertCircle, CheckCircle, Calendar, BarChart3 } from "lucide-react";
import ProductionFacilityForm from "./ProductionFacilityForm";

interface ProductionFacility {
  id: number;
  facilityName: string;
  facilityType: string;
  location: string;
  isOwnFacility: boolean;
  isPrimaryFacility: boolean;
  annualCapacityVolume: string | null;
  capacityUnit: string;
  averageUtilizationPercent: string | null;
  // Actual database fields for energy/water
  totalElectricityKwhPerYear?: string | null;
  totalProcessWaterLitersPerYear?: string | null;
  renewableEnergyPercent?: string | null;
  // Calculated field from backend
  completenessScore?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ProductionFacilitiesList() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingFacility, setEditingFacility] = useState<ProductionFacility | null>(null);
  const [monthlyDataFacility, setMonthlyDataFacility] = useState<ProductionFacility | null>(null);

  const { data: facilities, isLoading, refetch } = useQuery({
    queryKey: ['/api/production-facilities'],
    retry: false,
    staleTime: 0,
    cacheTime: 0,
    refetchOnMount: 'always',
    select: (data: any) => data?.data || [],
  });

  const handleFormComplete = () => {
    setShowCreateForm(false);
    setEditingFacility(null);
    setMonthlyDataFacility(null);
    refetch();
  };

  const formatCapacity = (volume: string | null, unit: string) => {
    if (!volume) return `0 ${unit}`;
    const numVolume = parseFloat(volume);
    if (isNaN(numVolume)) return `0 ${unit}`;
    
    if (numVolume >= 1000000) {
      return `${(numVolume / 1000000).toFixed(1)}M ${unit}`;
    } else if (numVolume >= 1000) {
      return `${(numVolume / 1000).toFixed(1)}K ${unit}`;
    }
    return `${numVolume.toLocaleString()} ${unit}`;
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
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Production Facilities</h3>
          <p className="text-sm text-gray-600">
            {facilities?.length || 0} facilities configured
          </p>
        </div>
        <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Facility
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border shadow">
            <ProductionFacilityForm
              onComplete={handleFormComplete}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Facilities Grid */}
      {!facilities || !Array.isArray(facilities) || facilities.length === 0 ? (
        <Card className="border-2 border-dashed border-gray-300 bg-gray-50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mb-4" />
            <h4 className="font-medium text-gray-600 mb-2">No Production Facilities</h4>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              Create your first production facility to start centralizing your production data. 
              This will eliminate repetitive data entry across products.
            </p>
            <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Facility
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border shadow">
                <ProductionFacilityForm
                  onComplete={handleFormComplete}
                  onCancel={() => setShowCreateForm(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {facilities.map((facility) => (
            <Card key={facility.id} className="relative hover:shadow-md transition-shadow">
              {facility.isPrimaryFacility && (
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Primary
                  </Badge>
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    {getFacilityTypeIcon(facility.facilityType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{facility.facilityName}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      {getFacilityTypeIcon(facility.facilityType)}
                      {getFacilityTypeLabel(facility.facilityType)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Location */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  {facility.location}
                </div>

                {/* Capacity */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Annual Capacity</span>
                  <span className="text-sm text-gray-900">
                    {formatCapacity(facility.annualCapacityVolume, facility.capacityUnit)}
                  </span>
                </div>

                {/* Utilization */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Utilization</span>
                  <span className="text-sm text-gray-900">
                    {facility.averageUtilizationPercent}%
                  </span>
                </div>

                {/* Monthly Data Collection Access */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-50 to-blue-50 border-green-200 hover:from-green-100 hover:to-blue-100"
                    onClick={() => setMonthlyDataFacility(facility)}
                  >
                    <Calendar className="w-4 h-4 text-green-600 mr-2" />
                    <div className="flex-1 text-left">
                      <div className="text-xs font-medium text-green-900">Monthly Data Entry</div>
                      <div className="text-xs text-green-700">Track operational data</div>
                    </div>
                    <BarChart3 className="w-3 h-3 text-blue-600" />
                  </Button>
                </div>

                {/* Completeness Score */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium text-gray-700">Data Completeness</span>
                  <div className="flex items-center gap-2">
                    {(facility.completenessScore || 0) >= 80 ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={`${
                        (facility.completenessScore || 0) >= 80 ? 
                          'bg-green-50 text-green-700 border-green-200' :
                        (facility.completenessScore || 0) >= 60 ? 
                          'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {facility.completenessScore || 0}%
                    </Badge>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3">
                  <Dialog 
                    open={editingFacility?.id === facility.id} 
                    onOpenChange={(open) => !open && setEditingFacility(null)}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => setEditingFacility(facility)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border shadow">
                      <ProductionFacilityForm
                        facilityId={facility.id}
                        existingData={facility}
                        onComplete={handleFormComplete}
                        onCancel={() => setEditingFacility(null)}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Monthly Data Popup */}
                  <Dialog 
                    open={monthlyDataFacility?.id === facility.id} 
                    onOpenChange={(open) => !open && setMonthlyDataFacility(null)}
                  >
                    <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white border shadow">
                      <ProductionFacilityForm
                        facilityId={facility.id}
                        existingData={facility}
                        onComplete={handleFormComplete}
                        onCancel={() => setMonthlyDataFacility(null)}
                        defaultTab="monthly-data"
                      />
                    </DialogContent>
                  </Dialog>
                  
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}