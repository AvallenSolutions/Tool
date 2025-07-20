import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Building2, Plus } from "lucide-react";
import SupplierProductSearch from "./SupplierProductSearch";
import SupplierProductDetail from "./SupplierProductDetail";

interface SupplierProduct {
  id: string;
  supplierId: string;
  productName: string;
  productDescription?: string;
  sku?: string;
  hasPrecalculatedLca: boolean;
  lcaDataJson?: any;
  productAttributes?: any;
  basePrice?: number;
  currency?: string;
  minimumOrderQuantity?: number;
  leadTimeDays?: number;
  certifications?: string[];
  supplierName: string;
  supplierCategory: string;
}

interface SupplierSelectionModalProps {
  inputType: string; // 'bottle', 'label', 'closure', etc.
  onSelect: (product: SupplierProduct) => void;
  onManualEntry: () => void;
  children: React.ReactNode;
  selectedProduct?: SupplierProduct;
}

// Map input types to supplier categories
const INPUT_TYPE_TO_CATEGORY: Record<string, string> = {
  bottle: "bottle_producer",
  label: "label_maker", 
  closure: "closure_producer",
  packaging: "secondary_packaging",
  ingredient: "ingredient_supplier",
  spirits: "contract_distillery",
};

const CATEGORY_LABELS: Record<string, string> = {
  bottle_producer: "Bottle Producers",
  label_maker: "Label Makers",
  closure_producer: "Closure Producers", 
  secondary_packaging: "Secondary Packaging",
  ingredient_supplier: "Ingredient Suppliers",
  contract_distillery: "Contract Distilleries",
};

export default function SupplierSelectionModal({
  inputType,
  onSelect,
  onManualEntry,
  children,
  selectedProduct,
}: SupplierSelectionModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("browse");
  const [currentProduct, setCurrentProduct] = useState<SupplierProduct | null>(selectedProduct || null);

  const category = INPUT_TYPE_TO_CATEGORY[inputType];
  const categoryLabel = CATEGORY_LABELS[category] || "Suppliers";

  const handleProductSelect = (product: SupplierProduct) => {
    setCurrentProduct(product);
    setSelectedTab("details");
  };

  const handleConfirmSelection = () => {
    if (currentProduct) {
      onSelect(currentProduct);
      setOpen(false);
    }
  };

  const handleManualEntry = () => {
    onManualEntry();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Select {categoryLabel.slice(0, -1)} Product
          </DialogTitle>
          <DialogDescription>
            Choose from our verified supplier network or enter product details manually
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 bg-gray-100 dark:bg-gray-800">
            <TabsTrigger value="browse" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100">
              <Package className="h-4 w-4" />
              Browse Products
            </TabsTrigger>
            <TabsTrigger value="details" disabled={!currentProduct} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 data-[state=active]:bg-white data-[state=active]:text-gray-900 dark:data-[state=active]:bg-gray-900 dark:data-[state=active]:text-gray-100">
              <Building2 className="h-4 w-4" />
              Product Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
            <div className="h-full overflow-auto">
              <SupplierProductSearch
                category={category}
                onSelect={handleProductSelect}
                selectedProductId={currentProduct?.id}
                className="border-0 shadow-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="details" className="flex-1 overflow-hidden bg-white dark:bg-gray-900">
            {currentProduct ? (
              <div className="h-full max-h-[65vh] overflow-auto">
                <SupplierProductDetail 
                  product={currentProduct}
                  showLcaData={true}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No product selected</p>
                  <p className="text-sm">Select a product from the browse tab to view details</p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <Button variant="outline" onClick={handleManualEntry} className="flex items-center gap-2 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
            <Plus className="h-4 w-4" />
            Enter Manually
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
              Cancel
            </Button>
            
            {currentProduct && (
              <Button onClick={handleConfirmSelection} className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Use This Product
                {currentProduct.hasPrecalculatedLca && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    LCA Verified
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Selected Product Summary */}
        {currentProduct && (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium text-gray-900 dark:text-gray-100">{currentProduct.productName}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">by {currentProduct.supplierName}</span>
              </div>
              <div className="flex items-center gap-2">
                {currentProduct.hasPrecalculatedLca && (
                  <Badge variant="secondary" className="text-xs">Verified LCA</Badge>
                )}
                {currentProduct.certifications && currentProduct.certifications.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {currentProduct.certifications.length} cert{currentProduct.certifications.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}