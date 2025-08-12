import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface SearchAndFilterBarProps {
  onSearch: (filters: SearchFilters) => void;
  placeholder?: string;
  showCategoryFilter?: boolean;
  showSupplierFilter?: boolean;
  className?: string;
}

export interface SearchFilters {
  name?: string;
  category?: string;
  supplier_id?: string;
}

interface ProductCategory {
  category: string;
  count: number;
}

export function SearchAndFilterBar({ 
  onSearch, 
  placeholder = "Search products...",
  showCategoryFilter = true,
  showSupplierFilter = false,
  className = ""
}: SearchAndFilterBarProps) {
  const [searchName, setSearchName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Fetch available categories
  const { data: categories } = useQuery<ProductCategory[]>({
    queryKey: ['/api/products/categories'],
    enabled: showCategoryFilter,
  });

  // Fetch suppliers for filter (if needed)
  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
    enabled: showSupplierFilter,
  });

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchName);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchName]);

  // Trigger search when filters change
  useEffect(() => {
    const filters: SearchFilters = {};
    
    if (debouncedSearch.trim()) {
      filters.name = debouncedSearch.trim();
    }
    
    if (selectedCategory) {
      filters.category = selectedCategory;
    }
    
    if (selectedSupplier) {
      filters.supplier_id = selectedSupplier;
    }

    onSearch(filters);
  }, [debouncedSearch, selectedCategory, selectedSupplier, onSearch]);

  const handleClearFilters = () => {
    setSearchName("");
    setSelectedCategory("");
    setSelectedSupplier("");
  };

  const hasActiveFilters = searchName || selectedCategory || selectedSupplier;

  return (
    <div className={`flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-lg ${className}`}>
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>

      {/* Category Filter */}
      {showCategoryFilter && (
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories?.map((category) => (
              <SelectItem key={category.category} value={category.category}>
                {category.category} ({category.count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Supplier Filter */}
      {showSupplierFilter && suppliers && (
        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Suppliers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Suppliers</SelectItem>
            {suppliers.map((supplier) => (
              <SelectItem key={supplier.id} value={supplier.id}>
                {supplier.supplierName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleClearFilters}
          className="flex items-center gap-2"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}