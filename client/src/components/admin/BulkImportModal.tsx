import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Upload, 
  Globe, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Building2,
  Package,
  Eye,
  Edit3,
  Save,
  X,
  Download
} from 'lucide-react';

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BulkImportResult {
  success: boolean;
  supplierData: any;
  productsData: any[];
  totalProducts: number;
}

interface JobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

export default function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const [activeTab, setActiveTab] = useState('url');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<BulkImportResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedSupplier, setEditedSupplier] = useState<any>(null);
  const [editedProducts, setEditedProducts] = useState<any[]>([]);

  // Start URL import mutation
  const urlImportMutation = useMutation({
    mutationFn: async (importUrl: string) => {
      const response = await apiRequest('POST', '/api/admin/bulk-import/url', {
        url: importUrl
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setCurrentJobId(result.jobId);
      }
    }
  });

  // Start PDF import mutation
  const pdfImportMutation = useMutation({
    mutationFn: async (pdfFile: File) => {
      const formData = new FormData();
      formData.append('file', pdfFile);
      
      const response = await fetch('/api/admin/bulk-import/pdf', {
        method: 'POST',
        body: formData
      });
      return response.json();
    },
    onSuccess: (result) => {
      if (result.success) {
        setCurrentJobId(result.jobId);
      }
    }
  });

  // Poll job status
  const { data: jobStatus } = useQuery<JobStatus>({
    queryKey: ['bulkImportStatus', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      const response = await apiRequest('GET', `/api/admin/bulk-import/status/${currentJobId}`);
      return response.json();
    },
    enabled: !!currentJobId,
    refetchInterval: (data) => {
      // Stop polling when completed or failed
      return data?.status === 'completed' || data?.status === 'failed' ? false : 2000;
    }
  });

  // Get results when job is completed
  const { data: results } = useQuery<BulkImportResult>({
    queryKey: ['bulkImportResults', currentJobId],
    queryFn: async () => {
      if (!currentJobId) return null;
      const response = await apiRequest('GET', `/api/admin/bulk-import/results/${currentJobId}`);
      return response.json();
    },
    enabled: !!currentJobId && jobStatus?.status === 'completed'
  });

  // Update import results when they arrive
  useState(() => {
    if (results && !importResults) {
      setImportResults(results);
      setEditedSupplier(results.supplierData);
      setEditedProducts(results.productsData || []);
    }
  }, [results]);

  // Save bulk import mutation
  const saveBulkImportMutation = useMutation({
    mutationFn: async () => {
      // TODO: Implement bulk save to database
      // This would create the supplier and all products in one transaction
      const response = await apiRequest('POST', '/api/admin/bulk-import/save', {
        supplierData: editedSupplier,
        productsData: editedProducts
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate supplier queries
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
      onOpenChange(false);
      resetForm();
    }
  });

  const handleUrlImport = () => {
    if (!url.trim()) return;
    urlImportMutation.mutate(url.trim());
  };

  const handlePdfImport = () => {
    if (!file) return;
    pdfImportMutation.mutate(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
    }
  };

  const handleSaveImport = () => {
    saveBulkImportMutation.mutate();
  };

  const resetForm = () => {
    setUrl('');
    setFile(null);
    setCurrentJobId(null);
    setImportResults(null);
    setEditedSupplier(null);
    setEditedProducts([]);
    setEditMode(false);
    urlImportMutation.reset();
    pdfImportMutation.reset();
  };

  const updateSupplierField = (field: string, value: string) => {
    setEditedSupplier(prev => ({ ...prev, [field]: value }));
  };

  const updateProductField = (index: number, field: string, value: string) => {
    setEditedProducts(prev => prev.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    ));
  };

  const removeProduct = (index: number) => {
    setEditedProducts(prev => prev.filter((_, i) => i !== index));
  };

  const isImporting = urlImportMutation.isPending || pdfImportMutation.isPending || 
                    (jobStatus && ['pending', 'processing'].includes(jobStatus.status));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Bulk Supplier Import
          </DialogTitle>
        </DialogHeader>

        {!importResults ? (
          <div className="space-y-6">
            {/* Import Options */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Import from URL
                </TabsTrigger>
                <TabsTrigger value="pdf" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Upload PDF Catalog
                </TabsTrigger>
              </TabsList>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-url">Product Catalog URL</Label>
                  <Input
                    id="import-url"
                    type="url"
                    placeholder="https://supplier-website.com/products"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isImporting}
                  />
                </div>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Provide a URL to a supplier's product catalog page. The system will automatically extract 
                    company information and crawl all product pages.
                  </AlertDescription>
                </Alert>
                <Button 
                  onClick={handleUrlImport}
                  disabled={!url.trim() || isImporting}
                  className="w-full"
                >
                  {urlImportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Import...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Start URL Import
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="pdf" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pdf-upload">PDF Catalog File</Label>
                  <Input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    disabled={isImporting}
                  />
                </div>
                {file && (
                  <Alert>
                    <FileText className="h-4 w-4" />
                    <AlertDescription>
                      Selected: {file.name} ({Math.round(file.size / 1024)} KB)
                    </AlertDescription>
                  </Alert>
                )}
                <Button 
                  onClick={handlePdfImport}
                  disabled={!file || isImporting}
                  className="w-full"
                >
                  {pdfImportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Import...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Start PDF Import
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>

            {/* Progress */}
            {jobStatus && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Import Progress</span>
                    <Badge variant={
                      jobStatus.status === 'completed' ? 'default' :
                      jobStatus.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {jobStatus.status}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Progress value={jobStatus.progress} className="w-full" />
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{jobStatus.progress}% complete</span>
                    <span>
                      {jobStatus.status === 'pending' && 'Initializing...'}
                      {jobStatus.status === 'processing' && 'Extracting data...'}
                      {jobStatus.status === 'completed' && 'Import completed!'}
                      {jobStatus.status === 'failed' && 'Import failed'}
                    </span>
                  </div>
                  {jobStatus.error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{jobStatus.error}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          /* Results Review */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Review Extracted Data</h3>
                <p className="text-sm text-gray-600">
                  Found 1 supplier with {importResults.totalProducts} products. Review and edit before saving.
                </p>
              </div>
              <div className="flex gap-2">
                {!editMode ? (
                  <Button onClick={() => setEditMode(true)} variant="outline">
                    <Edit3 className="w-4 h-4 mr-2" />
                    Edit Data
                  </Button>
                ) : (
                  <>
                    <Button onClick={() => setEditMode(false)} variant="outline">
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      onClick={handleSaveImport}
                      disabled={saveBulkImportMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Save All Data
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Supplier Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Supplier Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {editMode ? (
                  <>
                    <div>
                      <Label>Company Name</Label>
                      <Input 
                        value={editedSupplier?.companyName || ''} 
                        onChange={(e) => updateSupplierField('companyName', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Supplier Type</Label>
                      <Input 
                        value={editedSupplier?.supplierType || ''} 
                        onChange={(e) => updateSupplierField('supplierType', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input 
                        value={editedSupplier?.website || ''} 
                        onChange={(e) => updateSupplierField('website', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input 
                        value={editedSupplier?.email || ''} 
                        onChange={(e) => updateSupplierField('email', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Description</Label>
                      <Textarea 
                        value={editedSupplier?.description || ''} 
                        onChange={(e) => updateSupplierField('description', e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-sm font-medium">Company Name</Label>
                      <div className="p-2 bg-gray-50 rounded">{editedSupplier?.companyName || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <div className="p-2 bg-gray-50 rounded">{editedSupplier?.supplierType || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Website</Label>
                      <div className="p-2 bg-gray-50 rounded">{editedSupplier?.website || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <div className="p-2 bg-gray-50 rounded">{editedSupplier?.email || 'N/A'}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Products Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Products ({editedProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {editedProducts.map((product, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{product.productName}</h4>
                        {editMode && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => removeProduct(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      
                      {editMode ? (
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <Label className="text-xs">Product Name</Label>
                            <Input 
                              value={product.productName || ''} 
                              onChange={(e) => updateProductField(index, 'productName', e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Material</Label>
                            <Input 
                              value={product.materialType || ''} 
                              onChange={(e) => updateProductField(index, 'materialType', e.target.value)}
                              className="h-8"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">SKU</Label>
                            <Input 
                              value={product.sku || ''} 
                              onChange={(e) => updateProductField(index, 'sku', e.target.value)}
                              className="h-8"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Material:</span> {product.materialType || 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-600">Weight:</span> {product.weight ? `${product.weight}${product.weightUnit || ''}` : 'N/A'}
                          </div>
                          <div>
                            <span className="text-gray-600">SKU:</span> {product.sku || 'N/A'}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => {
                resetForm();
                onOpenChange(false);
              }}>
                Cancel
              </Button>
              
              {!editMode && (
                <Button 
                  onClick={handleSaveImport}
                  disabled={saveBulkImportMutation.isPending}
                >
                  {saveBulkImportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save All Data
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}