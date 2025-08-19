import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";

interface AnalysisData {
  component: string;
  category: string;
  impact: number;
  percentage: number;
}

interface DetailedAnalysisTabsProps {
  detailedAnalysis: {
    carbon: AnalysisData[];
    water: AnalysisData[];
    waste: AnalysisData[];
  };
}

type SortField = 'component' | 'category' | 'impact' | 'percentage';
type SortDirection = 'asc' | 'desc';

interface SortableTableProps {
  data: AnalysisData[];
  impactUnit: string;
  impactLabel: string;
}

function SortableTable({ data, impactUnit, impactLabel }: SortableTableProps) {
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = (bValue as string).toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-gray-900 font-medium"
    >
      {children}
      <ArrowUpDown className="w-4 h-4" />
    </button>
  );

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton field="component">Component</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="category">Category</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="impact">{impactLabel}</SortButton>
            </TableHead>
            <TableHead>
              <SortButton field="percentage">% of Total</SortButton>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, index) => (
            <TableRow key={index} className="hover:bg-gray-50">
              <TableCell className="font-medium">{row.component}</TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  row.category === 'Liquid' ? 'bg-green-100 text-green-800' :
                  row.category === 'Process' ? 'bg-blue-100 text-blue-800' :
                  row.category === 'Packaging' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {row.category}
                </span>
              </TableCell>
              <TableCell>
                {row.impact.toFixed(3)} {impactUnit}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-avallen-green h-2 rounded-full"
                      style={{ width: `${row.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{row.percentage}%</span>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function DetailedAnalysisTabs({ detailedAnalysis }: DetailedAnalysisTabsProps) {
  return (
    <Card className="border-light-gray">
      <CardHeader>
        <CardTitle>Detailed Environmental Impact Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="carbon" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="carbon">Carbon Footprint (CO₂e)</TabsTrigger>
            <TabsTrigger value="water">Water Footprint (Litres)</TabsTrigger>
            <TabsTrigger value="waste">Production Waste (g)</TabsTrigger>
          </TabsList>

          <TabsContent value="carbon" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Carbon Impact by Component</h3>
                <p className="text-sm text-gray-600">
                  Total: {detailedAnalysis.carbon.reduce((sum, item) => sum + item.impact, 0).toFixed(3)} kg CO₂e
                </p>
              </div>
              <SortableTable 
                data={detailedAnalysis.carbon}
                impactUnit="kg CO₂e"
                impactLabel="Impact per Bottle"
              />
            </div>
          </TabsContent>

          <TabsContent value="water" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Water Impact by Component</h3>
                <p className="text-sm text-gray-600">
                  Total: {detailedAnalysis.water.reduce((sum, item) => sum + item.impact, 0).toFixed(1)} L
                </p>
              </div>
              <SortableTable 
                data={detailedAnalysis.water}
                impactUnit="L"
                impactLabel="Impact per Bottle"
              />
            </div>
          </TabsContent>

          <TabsContent value="waste" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Waste Output by Component</h3>
                <p className="text-sm text-gray-600">
                  Total: {detailedAnalysis.waste.reduce((sum, item) => sum + item.impact, 0).toFixed(1)} g
                </p>
              </div>
              <SortableTable 
                data={detailedAnalysis.waste}
                impactUnit="g"
                impactLabel="Waste per Bottle"
              />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}