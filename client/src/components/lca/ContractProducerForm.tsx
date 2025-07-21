import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload,
  FileText,
  Building2,
  Mail,
  CheckCircle,
  Clock,
  AlertTriangle,
  Search,
  Download,
  Loader2,
  ArrowRight,
  Info
} from 'lucide-react';
import SupplierSelectionModal from '@/components/supplier-network/SupplierSelectionModal';

// Contract producer LCA data schema
const contractProducerSchema = z.object({
  // Basic contract producer info
  contractProducer: z.object({
    name: z.string().min(1, "Producer name is required"),
    location: z.string().min(1, "Location is required"),
    contactEmail: z.string().email("Valid email is required"),
    productionMethod: z.enum(['distillery', 'brewery', 'winery', 'cidery', 'other']),
  }),
  
  // Data collection method
  dataCollectionMethod: z.enum(['verified_network', 'document_upload', 'producer_invitation']),
  
  // Verified network selection (if applicable)
  selectedProducerId: z.string().optional(),
  
  // Document upload (if applicable)
  uploadedDocuments: z.array(z.object({
    fileName: z.string(),
    fileUrl: z.string(),
    documentType: z.enum(['lca_report', 'epd', 'sustainability_certificate', 'other']),
  })).optional(),
  
  // Producer invitation details (if applicable)
  invitationMessage: z.string().optional(),
});

type ContractProducerForm = z.infer<typeof contractProducerSchema>;

interface ContractProducerFormProps {
  productId: number;
  existingData?: any;
  onComplete?: () => void;
  className?: string;
}

export default function ContractProducerForm({ productId, existingData, onComplete, className }: ContractProducerFormProps) {
  const [activeTab, setActiveTab] = useState<string>('verified_network');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<any>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ContractProducerForm>({
    resolver: zodResolver(contractProducerSchema),
    defaultValues: existingData || {
      contractProducer: {
        name: '',
        location: '',
        contactEmail: '',
        productionMethod: 'distillery',
      },
      dataCollectionMethod: 'verified_network',
    },
  });

  const saveLCAMutation = useMutation({
    mutationFn: async (data: ContractProducerForm) => {
      // Handle file uploads first if any
      let uploadedDocuments = [];
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach((file, index) => {
          formData.append(`documents`, file);
        });
        
        const uploadResponse = await fetch('/api/upload-lca-documents', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Failed to upload documents');
        }
        
        uploadedDocuments = await uploadResponse.json();
      }

      const lcaData = {
        productId,
        reportingPeriodStart: new Date().getFullYear() + '-01-01',
        reportingPeriodEnd: new Date().getFullYear() + '-12-31',
        lcaData: {
          contractProducer: data.contractProducer,
          dataCollectionMethod: data.dataCollectionMethod,
          selectedProducerId: data.selectedProducerId,
          uploadedDocuments: uploadedDocuments,
          invitationMessage: data.invitationMessage,
        },
        status: data.dataCollectionMethod === 'producer_invitation' ? 'incomplete' : 'complete',
      };
      
      return apiRequest('/api/lca-questionnaires', 'POST', lcaData);
    },
    onSuccess: () => {
      toast({
        title: "Contract Producer Data Saved",
        description: "Environmental data collection method has been configured.",
        className: "bg-[#209d50] text-white border-[#209d50]",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/lca-questionnaires'] });
      onComplete?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error Saving Data",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (files: FileList) => {
    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const handleSupplierSelect = (supplier: any) => {
    setSelectedProducer(supplier);
    form.setValue('selectedProducerId', supplier.id);
    form.setValue('contractProducer.name', supplier.supplierName);
    form.setValue('contractProducer.location', supplier.location || '');
    setShowSupplierModal(false);
  };

  const onSubmit = async (data: ContractProducerForm) => {
    setIsSubmitting(true);
    data.dataCollectionMethod = activeTab as any;
    try {
      await saveLCAMutation.mutateAsync(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Contract Producer Environmental Data
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose how to collect environmental data from your contract producer.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Basic Contract Producer Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Contract Producer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="producerName">Producer Name</Label>
                    <Input
                      id="producerName"
                      {...form.register('contractProducer.name')}
                      placeholder="e.g., Highland Distillery"
                    />
                    {form.formState.errors.contractProducer?.name && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.contractProducer.name.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="producerLocation">Location</Label>
                    <Input
                      id="producerLocation"
                      {...form.register('contractProducer.location')}
                      placeholder="e.g., Scotland, UK"
                    />
                    {form.formState.errors.contractProducer?.location && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.contractProducer.location.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      {...form.register('contractProducer.contactEmail')}
                      placeholder="sustainability@producer.com"
                    />
                    {form.formState.errors.contractProducer?.contactEmail && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.contractProducer.contactEmail.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="productionMethod">Production Type</Label>
                    <Select 
                      value={form.watch('contractProducer.productionMethod')} 
                      onValueChange={(value) => form.setValue('contractProducer.productionMethod', value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select production type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="distillery">Distillery</SelectItem>
                        <SelectItem value="brewery">Brewery</SelectItem>
                        <SelectItem value="winery">Winery</SelectItem>
                        <SelectItem value="cidery">Cidery</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Collection Method Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Environmental Data Collection Method</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose the best option for collecting environmental data from your producer.
                </p>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="verified_network" className="text-sm">
                      <Search className="h-4 w-4 mr-2" />
                      Verified Network
                    </TabsTrigger>
                    <TabsTrigger value="document_upload" className="text-sm">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Documents
                    </TabsTrigger>
                    <TabsTrigger value="producer_invitation" className="text-sm">
                      <Mail className="h-4 w-4 mr-2" />
                      Invite Producer
                    </TabsTrigger>
                  </TabsList>

                  {/* Option 1: Verified Network */}
                  <TabsContent value="verified_network" className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Select from our verified network of producers with pre-calculated environmental data.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      {selectedProducer ? (
                        <Card className="border-green-200 bg-green-50">
                          <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold text-green-800">{selectedProducer.supplierName}</h4>
                                <p className="text-sm text-green-600">{selectedProducer.location}</p>
                                <Badge className="mt-2 bg-green-100 text-green-800">
                                  Verified Producer
                                </Badge>
                              </div>
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm"
                                onClick={() => setShowSupplierModal(true)}
                              >
                                Change Selection
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">No Producer Selected</h3>
                          <p className="text-muted-foreground mb-4">
                            Choose a verified producer from our network
                          </p>
                          <Button 
                            type="button"
                            onClick={() => setShowSupplierModal(true)}
                          >
                            <Search className="h-4 w-4 mr-2" />
                            Browse Verified Producers
                          </Button>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Option 2: Document Upload */}
                  <TabsContent value="document_upload" className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Upload LCA reports, EPDs, or sustainability certificates from your producer.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Upload Documents</h3>
                          <p className="text-muted-foreground mb-4">
                            Accepted formats: PDF, JPG, PNG (max 10MB each)
                          </p>
                          <input
                            type="file"
                            multiple
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                            className="hidden"
                            id="document-upload"
                          />
                          <Button 
                            type="button"
                            onClick={() => document.getElementById('document-upload')?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Files
                          </Button>
                        </div>
                      </div>

                      {uploadedFiles.length > 0 && (
                        <div className="space-y-2">
                          <Label>Uploaded Files</Label>
                          {uploadedFiles.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">{file.name}</span>
                                <Badge variant="outline">{(file.size / 1024 / 1024).toFixed(1)} MB</Badge>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== index))}
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Option 3: Producer Invitation */}
                  <TabsContent value="producer_invitation" className="space-y-4">
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Send an invitation to your producer to submit their environmental data directly.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="invitationMessage">Invitation Message (Optional)</Label>
                        <Textarea
                          id="invitationMessage"
                          {...form.register('invitationMessage')}
                          placeholder="Add a personalized message for your producer..."
                          rows={4}
                        />
                      </div>

                      <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="pt-4">
                          <div className="flex items-start gap-3">
                            <Mail className="h-5 w-5 text-blue-600 mt-1" />
                            <div>
                              <h4 className="font-semibold text-blue-800 mb-2">What happens next?</h4>
                              <ul className="text-sm text-blue-700 space-y-1">
                                <li>• Producer receives a secure portal link via email</li>
                                <li>• They complete a simple environmental questionnaire</li>
                                <li>• Data is automatically integrated into your assessment</li>
                                <li>• You receive notification when completed</li>
                              </ul>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#209d50] hover:bg-[#1a7d40] text-white min-w-[140px]"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {activeTab === 'producer_invitation' ? 'Send Invitation' : 'Save Configuration'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Supplier Selection Modal */}
      {showSupplierModal && (
        <SupplierSelectionModal
          isOpen={showSupplierModal}
          onClose={() => setShowSupplierModal(false)}
          onSelect={handleSupplierSelect}
          category="contract_distillery"
          title="Select Contract Producer"
        />
      )}
    </div>
  );
}