import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, Activity } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface KPIData {
  id: string;
  name: string;
  current: number;
  target: number;
  unit: string;
  category: 'environmental' | 'social' | 'engagement';
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  deadline?: string;
  status: 'on-track' | 'at-risk' | 'behind' | 'achieved';
  isCustom: boolean;
}

interface KPIDetailModalProps {
  kpi: KPIData | null;
  isOpen: boolean;
  onClose: () => void;
}

const categoryConfig = {
  environmental: { color: 'bg-green-100 text-green-800', label: 'Environmental' },
  social: { color: 'bg-blue-100 text-blue-800', label: 'Social' },
  engagement: { color: 'bg-purple-100 text-purple-800', label: 'Engagement' },
};

const statusConfig = {
  'on-track': { color: 'bg-green-100 text-green-800', label: 'On Track' },
  'at-risk': { color: 'bg-yellow-100 text-yellow-800', label: 'At Risk' },
  'behind': { color: 'bg-red-100 text-red-800', label: 'Behind' },
  'achieved': { color: 'bg-blue-100 text-blue-800', label: 'Achieved' },
};

export function KPIDetailModal({ kpi, isOpen, onClose }: KPIDetailModalProps) {
  const [newValue, setNewValue] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateKPIMutation = useMutation({
    mutationFn: async (data: { kpiId: string; currentValue: number }) => {
      const response = await fetch('/api/kpi-data/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update KPI');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/kpi-data'] });
      toast({
        title: 'KPI Updated',
        description: 'The KPI value has been updated successfully.',
      });
      setNewValue('');
      onClose();
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update KPI. Please try again.',
        variant: 'destructive',
      });
    },
  });

  if (!kpi) return null;

  const progress = (kpi.current / kpi.target) * 100;
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus;

  const handleUpdate = () => {
    const value = parseFloat(newValue);
    if (isNaN(value) || value < 0) {
      toast({
        title: 'Invalid Value',
        description: 'Please enter a valid number.',
        variant: 'destructive',
      });
      return;
    }
    updateKPIMutation.mutate({ kpiId: kpi.id, currentValue: value });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-white border shadow-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Activity className="w-5 h-5" />
            {kpi.name}
          </DialogTitle>
          <DialogDescription>
            Track and update your sustainability KPI progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Info */}
          <div className="flex items-center gap-2">
            <Badge className={categoryConfig[kpi.category].color}>
              {categoryConfig[kpi.category].label}
            </Badge>
            <Badge className={statusConfig[kpi.status].color}>
              {statusConfig[kpi.status].label}
            </Badge>
            {kpi.deadline && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {kpi.deadline}
              </Badge>
            )}
          </div>

          {/* Current vs Target */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Progress</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(progress)}% of target
              </span>
            </div>
            
            <Progress value={Math.min(progress, 100)} className="h-3" />
            
            <div className="flex justify-between text-sm">
              <span className="font-medium">
                Current: <span className="text-blue-600">{kpi.current} {kpi.unit}</span>
              </span>
              <span className="font-medium">
                Target: <span className="text-green-600">{kpi.target} {kpi.unit}</span>
              </span>
            </div>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <TrendIcon className={`w-4 h-4 ${
              kpi.trend === 'up' ? 'text-green-600' : 
              kpi.trend === 'down' ? 'text-red-600' : 'text-gray-600'
            }`} />
            <span className="text-sm">
              Trend: {kpi.trend === 'up' ? 'Improving' : kpi.trend === 'down' ? 'Declining' : 'Stable'}
              {kpi.trendValue !== 0 && (
                <span className="font-medium ml-1">
                  ({kpi.trendValue > 0 ? '+' : ''}{kpi.trendValue}%)
                </span>
              )}
            </span>
          </div>

          {/* Update Value */}
          <div className="space-y-3 pt-4 border-t">
            <Label htmlFor="new-value">Update Current Value</Label>
            <div className="flex gap-2">
              <Input
                id="new-value"
                type="number"
                step="0.01"
                placeholder={`Enter new value (${kpi.unit})`}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
              />
              <Button 
                onClick={handleUpdate}
                disabled={updateKPIMutation.isPending || !newValue}
              >
                {updateKPIMutation.isPending ? 'Updating...' : 'Update'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the latest measurement for this KPI to track your progress.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}