import React from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { insertProductSchema, type InsertProductType } from "@shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Save, Package, Upload } from "lucide-react";
import { z } from "zod";

const editProductSchema = insertProductSchema.extend({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  type: z.string().min(1, "Product type is required"),
  volume: z.string().optional(),
  description: z.string().optional(),
  annualProductionVolume: z.union([z.string(), z.number()]).optional(),
  bottleWeight: z.union([z.string(), z.number()]).optional(),
  labelWeight: z.union([z.string(), z.number()]).optional(),
  closureWeight: z.union([z.string(), z.number()]).optional(),
}).omit({ companyId: true });

type EditProductFormData = z.infer<typeof editProductSchema>;

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();

  // Fetch product data
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["/api/products", id],
    enabled: isAuthenticated && !!id,
    retry: false,
  });

  const form = useForm<EditProductFormData>({
    resolver: zodResolver(editProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      type: "",
      volume: "",
      description: "",
      productionModel: "",
      packShotUrl: "",
      annualProductionVolume: "",
      bottleMaterial: "",
      bottleWeight: "",
      bottleRecycledContent: "",
      labelMaterial: "",
      labelWeight: "",
      closureMaterial: "",
      closureWeight: "",
    },
  });

  // Update form when product data loads
  React.useEffect(() => {
    if (product) {
      form.reset({
        name: product.name || "",
        sku: product.sku || "",
        type: product.type || "",
        volume: product.volume || "",
        description: product.description || "",
        productionModel: product.productionModel || "",
        packShotUrl: product.packShotUrl || "",
        annualProductionVolume: product.annualProductionVolume?.toString() || "",
        bottleMaterial: product.bottleMaterial || "",
        bottleWeight: product.bottleWeight?.toString() || "",
        bottleRecycledContent: product.bottleRecycledContent?.toString() || "",
        labelMaterial: product.labelMaterial || "",
        labelWeight: product.labelWeight?.toString() || "",
        closureMaterial: product.closureMaterial || "",
        closureWeight: product.closureWeight?.toString() || "",
      });
    }
  }, [product, form]);

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async (data: EditProductFormData) => {
      // Convert string numbers to numbers where needed
      const processedData = {
        ...data,
        annualProductionVolume: data.annualProductionVolume ? parseFloat(data.annualProductionVolume.toString()) : null,
        bottleWeight: data.bottleWeight ? parseFloat(data.bottleWeight.toString()) : null,
        bottleRecycledContent: data.bottleRecycledContent ? parseFloat(data.bottleRecycledContent.toString()) : null,
        labelWeight: data.labelWeight ? parseFloat(data.labelWeight.toString()) : null,
        closureWeight: data.closureWeight ? parseFloat(data.closureWeight.toString()) : null,
      };

      const response = await apiRequest("PATCH", `/api/products/${id}`, processedData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products", id] });
      toast({
        title: "Product Updated",
        description: `${data.name} has been successfully updated.`,
      });
      navigate(`/app/products/${id}`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error("Error updating product:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditProductFormData) => {
    updateProductMutation.mutate(data);
  };

  if (isLoading || productLoading) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-avallen-green border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-lightest-gray flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-gray mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-4">The product you're trying to edit doesn't exist or has been removed.</p>
          <Button onClick={() => navigate("/app/products")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-lightest-gray">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header 
          title={`Edit ${product.name}`} 
          subtitle="Update product information and specifications" 
        />
        
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Back button and actions */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                onClick={() => navigate(`/app/products/${id}`)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Product
              </Button>
              
              <Button 
                onClick={form.handleSubmit(onSubmit)}
                disabled={updateProductMutation.isPending}
                className="bg-avallen-green hover:bg-green-600 text-white flex items-center gap-2"
              >
                {updateProductMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-avallen-green" />
                      Basic Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Avallen Calvados" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., AVALLEN-CALVADOS-750ML" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="spirit">Spirit</SelectItem>
                                <SelectItem value="beer">Beer</SelectItem>
                                <SelectItem value="wine">Wine</SelectItem>
                                <SelectItem value="cocktail">Cocktail</SelectItem>
                                <SelectItem value="non-alcoholic">Non-Alcoholic</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="volume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Volume</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., 750ml, 500ml, 1L" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Product description..." 
                              className="resize-none"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Production Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Production Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="productionModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Production Model</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select production model" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="own">Own Production</SelectItem>
                                <SelectItem value="contract">Contract Manufacturing</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="annualProductionVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Annual Production Volume</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="e.g., 10000" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Packaging Information */}
                <Card>
                  <CardHeader>
                    <CardTitle>Packaging Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="bottleMaterial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bottle Material</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select material" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="glass">Glass</SelectItem>
                                <SelectItem value="aluminium">Aluminium</SelectItem>
                                <SelectItem value="PET">PET</SelectItem>
                                <SelectItem value="paper">Paper</SelectItem>
                                <SelectItem value="tetrapak">Tetrapak</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bottleWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bottle Weight (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.001"
                                placeholder="e.g., 0.5" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="bottleRecycledContent"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Recycled Content (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                max="100"
                                placeholder="e.g., 75" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="labelMaterial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Label Material</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., paper, plastic" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="labelWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Label Weight (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.1"
                                placeholder="e.g., 2.5" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="closureMaterial"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closure Material</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., cork, plastic cap" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="closureWeight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closure Weight (g)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                placeholder="e.g., 1.5" 
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>


              </form>
            </Form>
          </div>
        </main>
      </div>
    </div>
  );
}