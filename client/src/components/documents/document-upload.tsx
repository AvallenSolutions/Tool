import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from "lucide-react";

export interface UploadedDocument {
  id: number;
  fileName: string;
  originalName: string;
  documentType?: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  confidence?: number;
  extractedData?: any;
  processingError?: string;
}

interface DocumentUploadProps {
  onDataExtracted?: (data: any) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  title?: string;
  description?: string;
}

export default function DocumentUpload({
  onDataExtracted,
  acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  maxFileSize = 10 * 1024 * 1024, // 10MB
  title = "Upload Utility Documents",
  description = "Upload utility bills, energy certificates, or waste reports to automatically extract environmental data"
}: DocumentUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocument[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data, file) => {
      setUploadedFiles(prev => [...prev, {
        id: data.documentId,
        fileName: file.name,
        originalName: file.name,
        processingStatus: 'processing'
      }]);
      
      toast({
        title: "Upload Successful",
        description: "Document uploaded and processing started",
      });
      
      // Poll for processing completion
      pollDocumentStatus(data.documentId);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const pollDocumentStatus = (documentId: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiRequest("GET", `/api/documents/${documentId}`);
        const document = response as UploadedDocument;
        
        setUploadedFiles(prev => prev.map(file => 
          file.id === documentId ? document : file
        ));
        
        if (document.processingStatus === 'completed') {
          clearInterval(interval);
          toast({
            title: "Processing Complete",
            description: `Data extracted with ${Math.round((document.confidence || 0) * 100)}% confidence`,
          });
          
          if (onDataExtracted && document.extractedData) {
            onDataExtracted(document.extractedData);
          }
        } else if (document.processingStatus === 'failed') {
          clearInterval(interval);
          toast({
            title: "Processing Failed",
            description: document.processingError || "Unknown error occurred",
            variant: "destructive",
          });
        }
      } catch (error) {
        clearInterval(interval);
        console.error('Error polling document status:', error);
      }
    }, 2000);
  };

  const applyDataMutation = useMutation({
    mutationFn: async (documentId: number) => {
      await apiRequest("POST", `/api/documents/${documentId}/apply-data`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Data Applied",
        description: "Extracted data has been added to your sustainability metrics",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to apply extracted data",
        variant: "destructive",
      });
    }
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      if (file.size > maxFileSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} is larger than ${maxFileSize / (1024 * 1024)}MB`,
          variant: "destructive",
        });
        return;
      }
      
      uploadMutation.mutate(file);
    });
  }, [uploadMutation, maxFileSize, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
  });

  const removeFile = (id: number) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-avallen-green bg-avallen-green/5' 
              : 'border-gray-300 hover:border-avallen-green hover:bg-avallen-green/5'
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-avallen-green font-medium">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                Drag & drop files here, or click to select files
              </p>
              <p className="text-sm text-gray-500">
                Supports: Images (JPEG, PNG, GIF) and PDF files up to {maxFileSize / (1024 * 1024)}MB
              </p>
            </div>
          )}
        </div>

        {/* Uploaded Files */}
        {uploadedFiles.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-slate-gray">Uploaded Documents</h4>
            {uploadedFiles.map((file) => (
              <Card key={file.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{file.originalName}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant={
                          file.processingStatus === 'completed' ? 'success' : 
                          file.processingStatus === 'failed' ? 'destructive' : 'secondary'
                        }>
                          {file.processingStatus}
                        </Badge>
                        {file.documentType && (
                          <Badge variant="outline">{file.documentType}</Badge>
                        )}
                        {file.confidence && (
                          <Badge variant="outline">
                            {Math.round(file.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {file.processingStatus === 'processing' && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    )}
                    {file.processingStatus === 'completed' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <Button
                          size="sm"
                          onClick={() => applyDataMutation.mutate(file.id)}
                          disabled={applyDataMutation.isPending}
                        >
                          Apply Data
                        </Button>
                      </>
                    )}
                    {file.processingStatus === 'failed' && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Show extracted data preview */}
                {file.processingStatus === 'completed' && file.extractedData && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">Extracted Data:</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {file.extractedData.electricityConsumption && (
                        <div>
                          <span className="font-medium">Electricity:</span> {file.extractedData.electricityConsumption} {file.extractedData.electricityUnit}
                        </div>
                      )}
                      {file.extractedData.gasConsumption && (
                        <div>
                          <span className="font-medium">Gas:</span> {file.extractedData.gasConsumption} {file.extractedData.gasUnit}
                        </div>
                      )}
                      {file.extractedData.waterConsumption && (
                        <div>
                          <span className="font-medium">Water:</span> {file.extractedData.waterConsumption} {file.extractedData.waterUnit}
                        </div>
                      )}
                      {file.extractedData.wasteGenerated && (
                        <div>
                          <span className="font-medium">Waste:</span> {file.extractedData.wasteGenerated} {file.extractedData.wasteUnit}
                        </div>
                      )}
                      {file.extractedData.billingPeriodStart && (
                        <div>
                          <span className="font-medium">Period:</span> {file.extractedData.billingPeriodStart} to {file.extractedData.billingPeriodEnd}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show error message */}
                {file.processingStatus === 'failed' && file.processingError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{file.processingError}</AlertDescription>
                  </Alert>
                )}
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}