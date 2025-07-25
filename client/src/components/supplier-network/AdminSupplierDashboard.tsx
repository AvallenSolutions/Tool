import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { 
  Building2, 
  Package, 
  Plus, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Award,
  Search,
  Users,
  ShoppingCart
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import BulkImportButton from "@/components/admin/BulkImportButton";

// Form schemas
const supplierFormSchema = z.object({
  supplierName: z.string().min(1, "Supplier name is required"),
  supplierCategory: z.string().min(1, "Category is required"),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email("Invalid email address"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  isVerified: z.boolean().default(false),
  adminNotes: z.string().optional(),
});

const productFormSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  productName: z.string().min(1, "Product name is required"),
  productDescription: z.string().optional(),
  sku: z.string().optional(),
  hasPrecalculatedLca: z.boolean().default(false),
  lcaDataJson: z.any().optional(),
  productAttributes: z.any().optional(),
  basePrice: z.number().positive().optional(),
  currency: z.string().default("USD"),
  minimumOrderQuantity: z.number().positive().optional(),
  leadTimeDays: z.number().positive().optional(),
  certifications: z.array(z.string()).optional(),
  isVerified: z.boolean().default(false),
  adminNotes: z.string().optional(),
});

const CATEGORY_OPTIONS = [
  { value: "bottle_producer", label: "Bottle Producer" },
  { value: "label_maker", label: "Label Maker" },
  { value: "closure_producer", label: "Closure Producer" },
  { value: "secondary_packaging", label: "Secondary Packaging" },
  { value: "ingredient_supplier", label: "Ingredient Supplier" },
  { value: "contract_distillery", label: "Contract Distillery" },
];

export default function AdminSupplierDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Fetch data
  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ['/api/verified-suppliers'],
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/supplier-products'],
  });

  // Mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/verified-suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      toast({ title: "Supplier created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create supplier", variant: "destructive" });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/admin/verified-suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verified-suppliers'] });
      toast({ title: "Supplier updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update supplier", variant: "destructive" });
    },
  });

  const createProductMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/admin/supplier-products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      toast({ title: "Product created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      apiRequest(`/api/admin/supplier-products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier-products'] });
      toast({ title: "Product updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update product", variant: "destructive" });
    },
  });

  // Filter functions
  const filteredSuppliers = suppliers?.filter((supplier: any) =>
    supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "" || supplier.supplierCategory === selectedCategory)
  ) || [];

  const filteredProducts = products?.filter((product: any) =>
    product.productName.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (selectedCategory === "" || product.supplierCategory === selectedCategory)
  ) || [];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Supplier Network Management</h1>
          <p className="text-muted-foreground">Manage verified suppliers and their product catalogs</p>
        </div>
        <div className="flex gap-2">
          <BulkImportButton />
          <CreateSupplierDialog 
            onSubmit={(data) => createSupplierMutation.mutate(data)}
            isLoading={createSupplierMutation.isPending}
          />
          <CreateProductDialog 
            suppliers={suppliers || []}
            onSubmit={(data) => createProductMutation.mutate(data)}
            isLoading={createProductMutation.isPending}
          />
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search suppliers or products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {CATEGORY_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="suppliers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Suppliers ({suppliers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Products ({products?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <SuppliersTable 
            suppliers={filteredSuppliers}
            isLoading={suppliersLoading}
            onUpdate={(id, data) => updateSupplierMutation.mutate({ id, data })}
            isUpdating={updateSupplierMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="products">
          <ProductsTable 
            products={filteredProducts}
            suppliers={suppliers || []}
            isLoading={productsLoading}
            onUpdate={(id, data) => updateProductMutation.mutate({ id, data })}
            isUpdating={updateProductMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component implementations would continue here...
// For brevity, I'll create the key components as separate files

function CreateSupplierDialog({ onSubmit, isLoading }: { onSubmit: (data: any) => void; isLoading: boolean }) {
  const [open, setOpen] = useState(false);
  const form = useForm({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      supplierName: "",
      supplierCategory: "",
      website: "",
      contactEmail: "",
      description: "",
      location: "",
      isVerified: false,
      adminNotes: "",
    },
  });

  const handleSubmit = (data: any) => {
    onSubmit(data);
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Verified Supplier</DialogTitle>
          <DialogDescription>
            Create a new supplier in the verified network
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_OPTIONS.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contactEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVerified"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Verified Supplier</FormLabel>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Supplier"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateProductDialog({ suppliers, onSubmit, isLoading }: { 
  suppliers: any[]; 
  onSubmit: (data: any) => void; 
  isLoading: boolean;
}) {
  // Implementation similar to CreateSupplierDialog...
  return null; // Simplified for now
}

function SuppliersTable({ suppliers, isLoading, onUpdate, isUpdating }: any) {
  // Implementation for suppliers table...
  return null; // Simplified for now
}

function ProductsTable({ products, suppliers, isLoading, onUpdate, isUpdating }: any) {
  // Implementation for products table...
  return null; // Simplified for now
}