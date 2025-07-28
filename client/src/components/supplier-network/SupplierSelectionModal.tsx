import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Building2, MapPin, CheckCircle, Loader2, Globe, Package } from 'lucide-react';

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
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [step, setStep] = useState<'suppliers' | 'products'>('suppliers');
  const category = getSupplierCategoryFromInputType(inputType);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch suppliers from API
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery({
    queryKey: ['/api/verified-suppliers', category],
    queryFn: async () => {
      const response = await fetch(`/api/verified-suppliers?category=${category}`, { 
        credentials: 'include' 
      });
      if (!response.ok) throw new Error('Failed to load suppliers');
      return response.json();
    },
    enabled: isOpen && step === 'suppliers'
  });

  // Fetch supplier products for selected supplier
  const { data: supplierProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/supplier-products', selectedSupplier?.id],
    queryFn: async () => {
      const response = await fetch(`/api/supplier-products?supplierId=${selectedSupplier.id}`, { 
        credentials: 'include' 
      });
      if (!response.ok) throw new Error('Failed to load supplier products');
      return response.json();
    },
    enabled: isOpen && step === 'products' && selectedSupplier
  });

  // Filter suppliers or products based on current step and search term
  const filteredSuppliers = suppliers.filter((supplier: any) => 
    supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.description && supplier.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredProducts = supplierProducts.filter((product: any) => 
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.productDescription && product.productDescription.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSupplierSelect = (supplier: any) => {
    setSelectedSupplier(supplier);
    setStep('products');
    setSearchTerm(''); // Clear search when moving to products
  };

  const handleProductSelect = (product: any) => {
    onSelect(product);
    setIsOpen(false);
    resetModal();
  };
  
  const handleManualEntry = () => {
    onManualEntry();
    setIsOpen(false);
    resetModal();
  };

  const handleBack = () => {
    setStep('suppliers');
    setSelectedSupplier(null);
    setSearchTerm('');
  };

  const resetModal = () => {
    setStep('suppliers');
    setSelectedSupplier(null);
    setSearchTerm('');
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)}>
        {children}
      </div>
      
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) resetModal();
      }}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col bg-white border border-gray-200 shadow-2xl">
        <DialogHeader className="border-b border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-gray-900">
            <Building2 className="h-6 w-6 text-[#209d50]" />
            {step === 'suppliers' ? 'Select Verified Supplier' : `${selectedSupplier?.supplierName} Products`}
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-2">
            {step === 'suppliers' 
              ? 'Choose a supplier from our verified network, then select their specific products.'
              : `Choose from ${selectedSupplier?.supplierName}'s verified products with pre-calculated environmental data.`
            }
          </p>
          {step === 'products' && (
            <Button 
              variant="ghost" 
              onClick={handleBack}
              className="mt-2 text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Suppliers
            </Button>
          )}
        </DialogHeader>

        {/* Search */}
        <div className="relative py-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder={step === 'suppliers' ? "Search suppliers..." : "Search products..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 py-3 text-base bg-white border-gray-300 focus:border-[#209d50] focus:ring-[#209d50]"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto space-y-3">
          {step === 'suppliers' ? (
            // Suppliers List
            filteredSuppliers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No verified suppliers found</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              filteredSuppliers.map((supplier: any) => (
                <Card key={supplier.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{supplier.supplierName}</h3>
                          <Badge 
                            variant="outline" 
                            className="text-green-700 border-green-200 bg-green-50"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{supplier.description}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {supplier.location || supplier.addressCountry}
                          </div>
                          {supplier.website && (
                            <div className="flex items-center gap-1">
                              <Globe className="h-4 w-4" />
                              <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                Website
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <Button 
                        onClick={() => handleSupplierSelect(supplier)}
                        className="ml-4 bg-[#209d50] hover:bg-[#1a7d40] text-white"
                      >
                        View Products
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          ) : (
            // Products List
            filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No products found for this supplier</p>
                <p className="text-sm">Try adjusting your search terms</p>
              </div>
            ) : (
              filteredProducts.map((product: any) => (
                <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 border border-gray-200 bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{product.productName}</h3>
                          <Badge 
                            variant="outline" 
                            className="text-green-700 border-green-200 bg-green-50"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            LCA Verified
                          </Badge>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{product.productDescription}</p>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          {product.basePrice && (
                            <div>
                              From: <span className="font-medium">{product.currency} {product.basePrice}</span>
                            </div>
                          )}
                          {product.minimumOrderQuantity && (
                            <div>
                              MOQ: <span className="font-medium">{product.minimumOrderQuantity} units</span>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {product.certifications && product.certifications.map((cert: any) => (
                            <Badge 
                              key={cert} 
                              variant="secondary" 
                              className="text-xs"
                            >
                              {cert}
                            </Badge>
                          ))}
                        </div>

                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span>SKU: {product.sku}</span>
                          {product.leadTimeDays && (
                            <span className="ml-2">• Lead time: {product.leadTimeDays} days</span>
                          )}
                        </p>
                      </div>

                      <Button 
                        onClick={() => handleProductSelect(product)}
                        className="ml-4 bg-[#209d50] hover:bg-[#1a7d40] text-white"
                      >
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 font-medium">
              {step === 'suppliers' 
                ? `${filteredSuppliers.length} verified suppliers found`
                : `${filteredProducts.length} products found`
              }
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleManualEntry} className="border-gray-300">
                Enter Manually
              </Button>
              <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-600 hover:text-gray-900">
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}