import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Users, Factory, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface ProductionStage {
  id: string;
  name: string;
  type: 'in-house' | 'outsourced';
  ecoinventProcessId?: string;
}

interface EcoinventProcess {
  id: string;
  materialName: string;
  processName: string;
  unit: string;
  subcategory: string;
}

interface ProductionTypeSelectorProps {
  onComplete: (productionData: {
    productionType: 'in-house' | 'contract-manufacturing' | 'hybrid';
    facilityId?: number;
    ecoinventProcessId?: string;
    stages?: ProductionStage[];
  }) => void;
  onBack?: () => void;
}

export default function ProductionTypeSelector({ onComplete, onBack }: ProductionTypeSelectorProps) {
  const [step, setStep] = useState<'type-selection' | 'in-house' | 'contract-manufacturing' | 'hybrid'>('type-selection');
  const [productionType, setProductionType] = useState<'in-house' | 'contract-manufacturing' | 'hybrid' | null>(null);
  const [selectedEcoinventProcess, setSelectedEcoinventProcess] = useState<string>('');
  const [stages, setStages] = useState<ProductionStage[]>([]);

  // Data completeness check for In House path
  const { data: completenessData, isLoading: completenessLoading } = useQuery({
    queryKey: ['/api/company/data-completeness'],
    enabled: step === 'in-house',
  });

  // Ecoinvent processes for Contract Manufacturing path
  const { data: ecoinventProcesses, isLoading: processesLoading } = useQuery<{ success: boolean; data: EcoinventProcess[] }>({
    queryKey: ['/api/lca/ecoinvent-processes'],
    enabled: step === 'contract-manufacturing' || step === 'hybrid',
  });

  const addStage = () => {
    const newStage: ProductionStage = {
      id: Date.now().toString(),
      name: '',
      type: 'in-house',
    };
    setStages([...stages, newStage]);
  };

  const updateStage = (id: string, updates: Partial<ProductionStage>) => {
    setStages(stages.map(stage => 
      stage.id === id ? { ...stage, ...updates } : stage
    ));
  };

  const removeStage = (id: string) => {
    setStages(stages.filter(stage => stage.id !== id));
  };

  const handleTypeSelection = (type: 'in-house' | 'contract-manufacturing' | 'hybrid') => {
    setProductionType(type);
    setStep(type);
  };

  const handleComplete = () => {
    if (!productionType) return;

    const productionData: Parameters<typeof onComplete>[0] = {
      productionType,
    };

    if (productionType === 'contract-manufacturing') {
      productionData.ecoinventProcessId = selectedEcoinventProcess;
    } else if (productionType === 'hybrid') {
      productionData.stages = stages;
    }

    onComplete(productionData);
  };

  // Type Selection Step
  if (step === 'type-selection') {
    return (
      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" data-testid="production-type-buttons">
            {/* In House Button - Green */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center justify-start gap-2 border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100 text-green-800 min-h-[240px] w-full overflow-hidden"
              onClick={() => handleTypeSelection('in-house')}
              data-testid="button-in-house"
            >
              <Building2 className="w-8 h-8 text-green-600 flex-shrink-0 mt-2" />
              <div className="text-center px-2 flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-sm text-green-800 mb-2">In House</h3>
                <p className="text-xs text-green-700 leading-tight break-words hyphens-auto">
                  We manufacture this product in our own facilities using our equipment and processes.
                </p>
              </div>
            </Button>

            {/* Contract Manufacturing Button - Blue */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center justify-start gap-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 text-blue-800 min-h-[240px] w-full overflow-hidden"
              onClick={() => handleTypeSelection('contract-manufacturing')}
              data-testid="button-contract-manufacturing"
            >
              <Users className="w-8 h-8 text-blue-600 flex-shrink-0 mt-2" />
              <div className="text-center px-2 flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-sm text-blue-800 mb-2">Contract Manufacturing</h3>
                <p className="text-xs text-blue-700 leading-tight break-words hyphens-auto">
                  A third-party manufacturer produces this product for us using their facilities.
                </p>
              </div>
            </Button>

            {/* Hybrid Button - Purple */}
            <Button
              variant="outline"
              className="h-auto p-4 flex flex-col items-center justify-start gap-2 border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100 text-purple-800 min-h-[240px] w-full overflow-hidden"
              onClick={() => handleTypeSelection('hybrid')}
              data-testid="button-hybrid"
            >
              <Factory className="w-8 h-8 text-purple-600 flex-shrink-0 mt-2" />
              <div className="text-center px-2 flex-1 flex flex-col justify-center">
                <h3 className="font-semibold text-sm text-purple-800 mb-2">Hybrid</h3>
                <p className="text-xs text-purple-700 leading-tight break-words hyphens-auto">
                  Some production stages are done in-house, others are outsourced to different partners.
                </p>
              </div>
            </Button>
          </div>

          {onBack && (
          <div className="flex justify-start mt-6">
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>
        )}
      </div>
    );
  }

  // In House Path
  if (step === 'in-house') {
    const isComplete = completenessData?.data?.isComplete;
    const missingFields = completenessData?.data?.missingFields || [];

    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            In-House Production Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              Great! To calculate the footprint accurately, the tool will use the annual consumption and 
              production data you've already provided in your company facilities.
            </p>
          </div>

          {completenessLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-muted-foreground">Checking data completeness...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {isComplete ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Your company data is complete!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Some of your annual company data is missing.</span>
                  </div>
                  <p className="text-muted-foreground">
                    Please complete it to continue with accurate footprint calculations.
                  </p>
                  {missingFields.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Missing data:</p>
                      <div className="flex flex-wrap gap-2">
                        {missingFields.map((field: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {field}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep('type-selection')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                
                {isComplete ? (
                  <Button onClick={handleComplete} className="flex-1" data-testid="button-continue">
                    Continue
                  </Button>
                ) : (
                  <>
                    <Link href="/company" className="flex-1">
                      <Button className="w-full" data-testid="button-complete-data">
                        Complete Company Data
                      </Button>
                    </Link>
                    <Button 
                      variant="secondary" 
                      disabled 
                      className="flex-1"
                      data-testid="button-continue-disabled"
                    >
                      Continue
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Contract Manufacturing Path
  if (step === 'contract-manufacturing') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Contract Manufacturing Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800">
              No problem. When using a contract manufacturer, we use industry-average data 
              from our comprehensive Ecoinvent database to calculate environmental impact.
            </p>
          </div>

          <div className="space-y-4">
            <Label htmlFor="process-select">
              Which of the following best describes the production process?
            </Label>
            
            {processesLoading ? (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-muted-foreground">Loading processes...</span>
              </div>
            ) : (
              <Select value={selectedEcoinventProcess} onValueChange={setSelectedEcoinventProcess}>
                <SelectTrigger data-testid="select-ecoinvent-process">
                  <SelectValue placeholder="Select a production process..." />
                </SelectTrigger>
                <SelectContent>
                  {ecoinventProcesses?.data?.map((process) => (
                    <SelectItem key={process.id} value={process.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{process.materialName}</span>
                        <span className="text-sm text-muted-foreground">
                          {process.subcategory} • {process.unit}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep('type-selection')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={!selectedEcoinventProcess}
              className="flex-1"
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Hybrid Path
  if (step === 'hybrid') {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-purple-600" />
            Hybrid Production Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-800">
              Perfect! Let's break down your production into stages. For each stage, 
              specify whether it's done in-house or outsourced.
            </p>
          </div>

          <div className="space-y-4">
            {stages.map((stage, index) => (
              <Card key={stage.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Stage {index + 1}</h4>
                    {stages.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeStage(stage.id)}
                        data-testid={`button-remove-stage-${index}`}
                      >
                        Remove
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor={`stage-name-${stage.id}`}>Stage Name</Label>
                      <Input
                        id={`stage-name-${stage.id}`}
                        placeholder="e.g., Fermentation & Distillation"
                        value={stage.name}
                        onChange={(e) => updateStage(stage.id, { name: e.target.value })}
                        data-testid={`input-stage-name-${index}`}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Production Type</Label>
                      <div className="flex gap-4">
                        <Button
                          variant={stage.type === 'in-house' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateStage(stage.id, { type: 'in-house', ecoinventProcessId: undefined })}
                          data-testid={`button-in-house-${index}`}
                        >
                          In-House
                        </Button>
                        <Button
                          variant={stage.type === 'outsourced' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => updateStage(stage.id, { type: 'outsourced' })}
                          data-testid={`button-outsourced-${index}`}
                        >
                          Outsourced
                        </Button>
                      </div>
                    </div>

                    {stage.type === 'outsourced' && (
                      <div>
                        <Label htmlFor={`process-${stage.id}`}>Ecoinvent Process</Label>
                        {processesLoading ? (
                          <div className="flex items-center py-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
                          </div>
                        ) : (
                          <Select
                            value={stage.ecoinventProcessId || ''}
                            onValueChange={(value) => updateStage(stage.id, { ecoinventProcessId: value })}
                          >
                            <SelectTrigger data-testid={`select-ecoinvent-process-${index}`}>
                              <SelectValue placeholder="Select process..." />
                            </SelectTrigger>
                            <SelectContent>
                              {ecoinventProcesses?.data?.map((process) => (
                                <SelectItem key={process.id} value={process.id}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{process.materialName}</span>
                                    <span className="text-sm text-muted-foreground">
                                      {process.subcategory} • {process.unit}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button
              variant="outline"
              onClick={addStage}
              className="w-full"
              data-testid="button-add-stage"
            >
              Add Stage
            </Button>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setStep('type-selection')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleComplete}
              disabled={stages.length === 0 || stages.some(s => !s.name)}
              className="flex-1"
              data-testid="button-continue"
            >
              Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}