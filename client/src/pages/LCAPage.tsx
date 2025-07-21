import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SimpleLCAForm from '@/components/lca/SimpleLCAForm';
import { 
  Leaf, 
  ArrowLeft, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Calculator
} from 'lucide-react';

export default function LCAPage() {
  const [, setLocation] = useLocation();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Fetch user's products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch existing LCA questionnaires for selected product
  const { data: questionnaires, refetch: refetchQuestionnaires } = useQuery({
    queryKey: ['/api/lca-questionnaires', selectedProductId],
    queryFn: () => fetch(`/api/lca-questionnaires?productId=${selectedProductId}`)
      .then(res => res.json()),
    enabled: !!selectedProductId,
  });

  const handleProductSelect = (productId: number) => {
    setSelectedProductId(productId);
    setShowForm(false);
  };

  const handleFormComplete = () => {
    setShowForm(false);
    refetchQuestionnaires();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'incomplete':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'processing':
        return <Calculator className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'incomplete':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (productsLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Leaf className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Environmental Impact Assessment</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Leaf className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Environmental Impact Assessment</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation('/products')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Products
        </Button>
      </div>

      {/* Description */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <FileText className="h-8 w-8 text-green-600 mt-1" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Simple LCA Assessment</h3>
              <p className="text-muted-foreground">
                Complete a quick 3-section questionnaire to calculate your product's environmental footprint.
                Focus on agriculture, transportation, and production to get accurate sustainability metrics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedProductId ? (
        /* Product Selection */
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Product</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((product: any) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProductSelect(product.id)}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{product.type}</Badge>
                    <Badge variant="outline">{product.volume}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {product.description || 'No description available'}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Production:</span>
                    <Badge variant="outline" className="text-xs">
                      {product.productionModel || 'own'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!products || products.length === 0) && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Leaf className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
                  <p className="text-muted-foreground mb-4">
                    You need to create a product before you can assess its environmental impact.
                  </p>
                  <Button onClick={() => setLocation('/products/new')}>
                    Create Your First Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Selected Product View */
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProductId(null)}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Products
              </Button>
              <div>
                <h2 className="text-xl font-semibold">
                  {products?.find((p: any) => p.id === selectedProductId)?.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Environmental Impact Assessment
                </p>
              </div>
            </div>
            
            {!showForm && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-[#209d50] hover:bg-[#1a7d40] text-white"
              >
                <Leaf className="h-4 w-4 mr-2" />
                Start Assessment
              </Button>
            )}
          </div>

          {/* Existing Questionnaires */}
          {questionnaires && questionnaires.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Previous Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {questionnaires.map((q: any) => (
                    <div key={q.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(q.status)}
                        <div>
                          <div className="font-medium">
                            {q.reportingPeriodStart} to {q.reportingPeriodEnd}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(q.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(q.status)}>
                        {q.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* LCA Form */}
          {showForm && (
            <SimpleLCAForm
              productId={selectedProductId}
              onComplete={handleFormComplete}
              className="mb-6"
            />
          )}

          {/* Instructions */}
          {!showForm && (
            <Card>
              <CardHeader>
                <CardTitle>How it Works</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-600 font-bold text-lg">1</span>
                    </div>
                    <h4 className="font-semibold mb-2">Agriculture Data</h4>
                    <p className="text-sm text-muted-foreground">
                      Tell us about your main ingredient, farm yield, and fuel usage
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold text-lg">2</span>
                    </div>
                    <h4 className="font-semibold mb-2">Transportation</h4>
                    <p className="text-sm text-muted-foreground">
                      Distance from farm and transport method
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 font-bold text-lg">3</span>
                    </div>
                    <h4 className="font-semibold mb-2">Production</h4>
                    <p className="text-sm text-muted-foreground">
                      Water and electricity usage in your production process
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}