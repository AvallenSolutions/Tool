import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, Droplets, TrendingUp } from "lucide-react";

interface Insight {
  component: string;
  percentage: number;
  suggestion: string;
}

interface ActionableInsightsProps {
  insights: {
    carbon_hotspot: Insight;
    water_hotspot: Insight;
  };
}

interface InsightCardProps {
  icon: React.ReactNode;
  title: string;
  hotspot: string;
  percentage: number;
  suggestion: string;
  color: string;
}

function InsightCard({ icon, title, hotspot, percentage, suggestion, color }: InsightCardProps) {
  return (
    <Card className="border-light-gray">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 p-3 rounded-lg ${color}`}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                percentage >= 50 ? 'bg-red-100 text-red-800' :
                percentage >= 30 ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {percentage}% Impact
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              <strong>{hotspot}</strong> represents the highest contribution to your environmental footprint.
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-700">{suggestion}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActionableInsights({ insights }: ActionableInsightsProps) {
  return (
    <Card className="border-light-gray">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-avallen-green" />
          Key Insights & Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Carbon Hotspot */}
          <InsightCard
            icon={<Lightbulb className="w-6 h-6 text-green-600" />}
            title="Carbon Hotspot Alert"
            hotspot={insights.carbon_hotspot.component}
            percentage={insights.carbon_hotspot.percentage}
            suggestion={insights.carbon_hotspot.suggestion}
            color="bg-green-100"
          />

          {/* Water Hotspot */}
          <InsightCard
            icon={<Droplets className="w-6 h-6 text-blue-600" />}
            title="Water Footprint Insight"
            hotspot={insights.water_hotspot.component}
            percentage={insights.water_hotspot.percentage}
            suggestion={insights.water_hotspot.suggestion}
            color="bg-blue-100"
          />
        </div>

        {/* Summary Section */}
        <div className="mt-6 p-4 bg-avallen-green/5 rounded-lg border border-avallen-green/20">
          <h4 className="font-medium text-gray-900 mb-2">Next Steps</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• Focus improvement efforts on the highest impact components</li>
            <li>• Engage with suppliers to explore sustainable alternatives</li>
            <li>• Set specific reduction targets for carbon and water footprints</li>
            <li>• Monitor progress through regular LCA updates</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}