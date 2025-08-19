import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface ProductPDFExportProps {
  product: {
    id: number;
    name: string;
  };
}

export default function ProductPDFExport({ product }: ProductPDFExportProps) {
  const { toast } = useToast();

  const downloadPDFMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}/sustainability-report-pdf`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to download PDF');
      }
      
      return response.blob();
    },
    onSuccess: (blob) => {
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Sustainability_Report_${product.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "PDF Downloaded",
        description: "Your product sustainability report has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: "Failed to download PDF report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDownloadPDF = () => {
    downloadPDFMutation.mutate(product.id);
  };

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Export Sustainability Report
          <Badge variant="secondary" className="ml-2">PDF Format</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Product Sustainability Report
            </h3>
            <p className="text-gray-600 mb-4">
              Download a comprehensive sustainability report for {product.name} including carbon footprint, 
              water usage, waste analysis, and compliance information.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                ISO 14067 Carbon Footprint
              </Badge>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                ISO 14046 Water Footprint
              </Badge>
              <Badge variant="outline" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                OpenLCA Verified Data
              </Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleDownloadPDF}
              disabled={downloadPDFMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              <Download className="w-4 h-4 mr-2" />
              {downloadPDFMutation.isPending ? 'Generating PDF...' : 'Download PDF Report'}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Professional format ready for stakeholders
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}