import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import LcaHeader from "@/components/lca/LcaHeader";
import PrimaryBreakdownCharts from "@/components/lca/PrimaryBreakdownCharts";
import DetailedAnalysisTabs from "@/components/lca/DetailedAnalysisTabs";
import ActionableInsights from "@/components/lca/ActionableInsights";
import { useRefinedLCA, transformRefinedLCAToMetrics, transformRefinedLCAToBreakdown } from "@/hooks/useRefinedLCA";

interface ProductLcaData {
  product: {
    id: number;
    name: string;
    image: string | null;
  };
  metrics: {
    carbonFootprint: { value: number; unit: string };
    waterFootprint: { value: number; unit: string };
    wasteOutput: { value: number; unit: string };
  };
  breakdown: {
    carbon: Array<{ stage: string; value: number; percentage: number }>;
    water: Array<{ stage: string; value: number; percentage: number }>;
  };
  detailedAnalysis: {
    carbon: Array<{ component: string; category: string; impact: number; percentage: number }>;
    water: Array<{ component: string; category: string; impact: number; percentage: number }>;
    waste: Array<{ component: string; category: string; impact: number; percentage: number }>;
  };
  insights: {
    carbon_hotspot: { component: string; percentage: number; suggestion: string };
    water_hotspot: { component: string; percentage: number; suggestion: string };
  };
}

export default function ProductLcaPage() {
  const { productId } = useParams();
  const [location] = useLocation();

  // Get report ID from URL params or use default
  const reportId = new URLSearchParams(location.split('?')[1] || '').get('reportId') || '1';

  // Fetch legacy LCA visual data (fallback)
  const { data: lcaData, isLoading: legacyLoading, error: legacyError } = useQuery<ProductLcaData>({
    queryKey: ['/api/reports', reportId, 'visual-data'],
    queryFn: async () => {
      const response = await fetch(`/api/reports/${reportId}/visual-data`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch LCA data: ${response.statusText}`);
      }
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch refined LCA data (primary source)
  const { 
    data: refinedLCAResponse, 
    isLoading: refinedLoading, 
    error: refinedError 
  } = useRefinedLCA(productId ? parseInt(productId) : undefined);

  // Determine which data to use and loading state
  const isLoading = refinedLoading || legacyLoading;
  const error = refinedError || legacyError;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href={`/app/products/${productId}`}>
              <a className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Product Details
              </a>
            </Link>
          </div>

          {/* Loading State */}
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-avallen-green" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading LCA Analysis</h3>
                <p className="text-gray-600">Preparing comprehensive environmental impact data...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <Link href={`/app/products/${productId}`}>
              <a className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Product Details
              </a>
            </Link>
          </div>

          {/* Error State */}
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading LCA Data</h3>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : 'Unable to load LCA analysis data'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-avallen-green hover:bg-avallen-green/90"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Prepare data - prioritize refined LCA if available
  let displayData: ProductLcaData | null = null;
  let dataSource = 'legacy';
  
  if (refinedLCAResponse?.success && refinedLCAResponse.data) {
    const refinedLCA = refinedLCAResponse.data;
    const refinedMetrics = transformRefinedLCAToMetrics(refinedLCA);
    const refinedBreakdown = transformRefinedLCAToBreakdown(refinedLCA);
    
    displayData = {
      product: {
        id: refinedLCA.productId,
        name: refinedLCA.productName,
        image: null // Will be populated from legacy data if needed
      },
      metrics: refinedMetrics,
      breakdown: {
        carbon: refinedBreakdown.carbonBreakdown,
        water: refinedBreakdown.waterBreakdown,
      },
      detailedAnalysis: lcaData?.detailedAnalysis || {
        carbon: [],
        water: [],
        waste: []
      },
      insights: lcaData?.insights || {
        carbon_hotspot: { component: 'Data updating', percentage: 0, suggestion: 'Refined LCA calculations in progress' },
        water_hotspot: { component: 'Data updating', percentage: 0, suggestion: 'Refined LCA calculations in progress' },
      }
    };
    dataSource = 'refined';
  } else if (lcaData) {
    displayData = lcaData;
    dataSource = 'legacy';
  }

  if (!displayData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href={`/app/products/${productId}`}>
            <a className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Product Details
            </a>
          </Link>
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Life Cycle Assessment</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive environmental impact analysis for {displayData.product.name}
          </p>
          {dataSource === 'refined' && (
            <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              ✓ Using Refined OpenLCA Calculations (Water dilution excluded)
            </div>
          )}
        </div>

        {/* Four Sections */}
        <div className="space-y-8">
          {/* Section 1: Header with Key Metrics */}
          <LcaHeader 
            product={displayData.product}
            metrics={displayData.metrics}
          />

          {/* Section 2: Primary Breakdown Charts */}
          <PrimaryBreakdownCharts 
            carbonBreakdown={displayData.breakdown.carbon}
            waterBreakdown={displayData.breakdown.water}
          />

          {/* Section 3: Detailed Analysis Tabs */}
          <DetailedAnalysisTabs 
            detailedAnalysis={displayData.detailedAnalysis}
          />

          {/* Section 4: Actionable Insights */}
          <ActionableInsights 
            insights={displayData.insights}
          />
        </div>
      </div>
    </div>
  );
}