import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Building2, MapPin, CheckCircle, Loader2 } from 'lucide-react';

// Map input types to supplier categories
function getSupplierCategoryFromInputType(inputType: string): string {
  switch (inputType) {
    case 'ingredient': return 'ingredient_supplier';
    case 'bottle': return 'bottle_producer';
    case 'closure': return 'closure_producer';
    case 'label': return 'label_maker';
    case 'contract': return 'contract_distillery';
    default: return 'ingredient_supplier';
  }
}

interface SupplierSelectionModalProps {
  inputType: string;
  onSelect: (supplier: any) => void;
  onManualEntry: () => void;
  selectedProduct: any;
  children: React.ReactNode;
}

// Mock verified producer data - in production this would come from API
const mockProducers = [
  {
    id: "prod_1",
    supplierName: "Highland Distillery Co.",
    location: "Scotland, UK",
    category: "contract_distillery",
    verificationStatus: "verified",
    environmentalRating: "A",
    specialties: ["Single Malt", "Grain Whisky"],
    lcaDataAvailable: true,
    carbonFootprint: "2.3 kg CO₂e/L",
    lastUpdated: "2024-12-15"
  },
  {
    id: "prod_2", 
    supplierName: "Celtic Craft Spirits",
    location: "Ireland",
    category: "contract_distillery",
    verificationStatus: "verified",
    environmentalRating: "A+",
    specialties: ["Irish Whiskey", "Gin"],
    lcaDataAvailable: true,
    carbonFootprint: "2.1 kg CO₂e/L",
    lastUpdated: "2024-12-20"
  },
  {
    id: "prod_3",
    supplierName: "Artisan Spirits Ltd",
    location: "England, UK", 
    category: "contract_distillery",
    verificationStatus: "verified",
    environmentalRating: "B+",
    specialties: ["Gin", "Vodka", "Rum"],
    lcaDataAvailable: true,
    carbonFootprint: "2.7 kg CO₂e/L",
    lastUpdated: "2024-12-10"
  },
  {
    id: "prod_4",
    supplierName: "Green Mountain Brewery",
    location: "Vermont, USA",
    category: "contract_brewery",
    verificationStatus: "verified", 
    environmentalRating: "A",
    specialties: ["Craft Beer", "Cider"],
    lcaDataAvailable: true,
    carbonFootprint: "0.8 kg CO₂e/L",
    lastUpdated: "2024-12-18"
  }
];

export default function SupplierSelectionModal({ 
  inputType,
  onSelect,
  onManualEntry,
  selectedProduct,
  children
}: SupplierSelectionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const category = getSupplierCategoryFromInputType(inputType);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter producers based on category and search term
  const filteredProducers = mockProducers.filter(producer => 
    producer.category === category &&
    (producer.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     producer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
     producer.specialties.some(specialty => 
       specialty.toLowerCase().includes(searchTerm.toLowerCase())
     ))
  );

  const handleSelect = (supplier: any) => {
    onSelect(supplier);
    setIsOpen(false);
  };
  
  const handleManualEntry = () => {
    onManualEntry();
    setIsOpen(false);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Select Supplier Product
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, location, or specialty..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {filteredProducers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No verified producers found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            filteredProducers.map((producer) => (
              <Card key={producer.id} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{producer.supplierName}</h3>
                        <Badge 
                          variant="outline" 
                          className="text-green-700 border-green-200 bg-green-50"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`${
                            producer.environmentalRating.startsWith('A') 
                              ? 'text-green-700 border-green-200 bg-green-50'
                              : 'text-blue-700 border-blue-200 bg-blue-50'
                          }`}
                        >
                          Rating: {producer.environmentalRating}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {producer.location}
                        </div>
                        <div>
                          Carbon Footprint: <span className="font-medium">{producer.carbonFootprint}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {producer.specialties.map((specialty) => (
                          <Badge 
                            key={specialty} 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {specialty}
                          </Badge>
                        ))}
                      </div>

                      <p className="text-xs text-gray-500">
                        LCA data last updated: {producer.lastUpdated}
                      </p>
                    </div>

                    <Button 
                      onClick={() => handleSelect(producer)}
                      className="ml-4 bg-[#209d50] hover:bg-[#1a7d40] text-white"
                    >
                      Select
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Footer */}
        <Separator />
        <div className="flex justify-between items-center text-sm text-gray-500">
          <span>{filteredProducers.length} verified producers found</span>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}