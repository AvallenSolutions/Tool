import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  ArrowRight,
  Database,
  Zap,
  Droplets,
  Factory
} from 'lucide-react';
import { useLocation } from 'wouter';

interface MonthlyAggregatedData {
  totalElectricityKwh: number;
  totalNaturalGasM3: number;
  totalWaterM3: number;
  totalProductionVolume: number;
  monthCount: number;
  dataQuality: 'high' | 'medium' | 'low';
  missingMonths: string[];
  latestDataMonth: string;
  dateRange: {
    start: string;
    end: string;
  };
}

interface MonthlyDataSummary {
  companyId: number;
  hasMonthlyData: boolean;
  aggregated: MonthlyAggregatedData | null;
  recommendation: 'complete' | 'needs_monthly_data' | 'incomplete_data';
  message: string;
}

export default function MonthlyDataSummaryCard() {
  const [location, navigate] = useLocation();

  const { data: monthlyDataSummary, isLoading } = useQuery({
    queryKey: ['/api/monthly-data-summary'],
    retry: false,
    staleTime: 60000, // Cache for 1 minute
  });

  const summary = monthlyDataSummary as MonthlyDataSummary | undefined;

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'complete': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'incomplete_data': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'needs_monthly_data': return <Database className="w-4 h-4 text-red-600" />;
      default: return <Database className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Loading Monthly Data Summary...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <Card className={`border-l-4 ${
      summary.recommendation === 'complete' ? 'border-l-green-500' :
      summary.recommendation === 'incomplete_data' ? 'border-l-yellow-500' :
      'border-l-red-500'
    }`}>
      <CardHeader className={`${
        summary.recommendation === 'complete' ? 'bg-gradient-to-r from-green-50 to-gray-50' :
        summary.recommendation === 'incomplete_data' ? 'bg-gradient-to-r from-yellow-50 to-gray-50' :
        'bg-gradient-to-r from-red-50 to-gray-50'
      }`}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${
              summary.recommendation === 'complete' ? 'bg-green-100' :
              summary.recommendation === 'incomplete_data' ? 'bg-yellow-100' :
              'bg-red-100'
            }`}>
              {getRecommendationIcon(summary.recommendation)}
            </div>
            Monthly Facility Data Status
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/app/facility-updates')}
            className="flex items-center gap-2"
            data-testid="button-view-facility-updates"
          >
            <Calendar className="w-4 h-4" />
            View Updates
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Primary data collection through monthly facility updates
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 pt-6">
        <Alert className={
          summary.recommendation === 'complete' ? 'border-green-200 bg-green-50' :
          summary.recommendation === 'incomplete_data' ? 'border-yellow-200 bg-yellow-50' :
          'border-red-200 bg-red-50'
        }>
          <AlertDescription className="flex items-center">
            {getRecommendationIcon(summary.recommendation)}
            <span className="ml-2">{summary.message}</span>
          </AlertDescription>
        </Alert>

        {summary.hasMonthlyData && summary.aggregated && (
          <>
            {/* Data Quality Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Data Quality:</span>
              <Badge className={getQualityColor(summary.aggregated.dataQuality)}>
                {summary.aggregated.dataQuality.toUpperCase()}
              </Badge>
              <span className="text-xs text-gray-500">
                {summary.aggregated.monthCount} months of data
              </span>
            </div>

            {/* Aggregated Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <Zap className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-blue-900">
                  {(parseFloat(summary.aggregated.totalElectricityKwh) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-blue-700">kWh/year</div>
              </div>
              
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Database className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-orange-900">
                  {parseFloat(summary.aggregated.totalNaturalGasM3).toFixed(0)}
                </div>
                <div className="text-xs text-orange-700">m³ Gas/year</div>
              </div>
              
              <div className="text-center p-3 bg-cyan-50 rounded-lg">
                <Droplets className="w-5 h-5 text-cyan-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-cyan-900">
                  {(parseFloat(summary.aggregated.totalWaterM3) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-cyan-700">m³ Water/year</div>
              </div>
              
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <Factory className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <div className="text-lg font-bold text-green-900">
                  {(parseFloat(summary.aggregated.totalProductionVolume) / 1000).toFixed(1)}k
                </div>
                <div className="text-xs text-green-700">L Production/year</div>
              </div>
            </div>

            {/* Missing Months Alert */}
            {summary.aggregated.missingMonths.length > 0 && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription>
                  <strong>Missing Data:</strong> {summary.aggregated.missingMonths.length} months need data entry.
                  {summary.aggregated.missingMonths.length <= 3 && (
                    <span className="ml-1">
                      Missing: {summary.aggregated.missingMonths.map(month => {
                        const date = new Date(month);
                        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                      }).join(', ')}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Date Range */}
            <div className="text-xs text-gray-500 flex items-center justify-center gap-2">
              <Calendar className="w-3 h-3" />
              <span>
                Data range: {new Date(summary.aggregated.dateRange.start).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })} - {new Date(summary.aggregated.dateRange.end).toLocaleDateString('en-US', { 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </span>
            </div>
          </>
        )}

        {!summary.hasMonthlyData && (
          <div className="text-center py-6">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start Monthly Data Collection</h3>
            <p className="text-sm text-gray-600 mb-4">
              Monthly facility updates provide more accurate and timely sustainability metrics than annual estimates.
            </p>
            <Button 
              onClick={() => navigate('/app/facility-updates')}
              className="flex items-center gap-2"
              data-testid="button-start-monthly-data"
            >
              <Calendar className="w-4 h-4" />
              Add Monthly Data
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}