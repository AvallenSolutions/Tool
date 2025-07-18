import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: string;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Your Sustainability Dashboard',
    content: 'This is your central hub for tracking, measuring, and reporting your environmental impact. Let\'s take a quick tour to show you around.',
    target: 'dashboard-main',
    position: 'bottom'
  },
  {
    id: 'total-co2e',
    title: 'Total CO2e Emissions',
    content: 'This shows your total carbon dioxide equivalent emissions calculated from your energy consumption and operational data. This is your primary sustainability metric.',
    target: 'metrics-co2e',
    position: 'bottom'
  },
  {
    id: 'water-usage',
    title: 'Water Usage',
    content: 'Track your water consumption across all operations. This helps identify opportunities for water conservation and efficiency improvements.',
    target: 'metrics-water',
    position: 'bottom'
  },
  {
    id: 'waste-generated',
    title: 'Waste Generated',
    content: 'Monitor your waste output to improve circular economy practices and reduce environmental impact. Focus on reducing, reusing, and recycling.',
    target: 'metrics-waste',
    position: 'bottom'
  },
  {
    id: 'emissions-chart',
    title: 'Emissions Breakdown',
    content: 'This chart shows your emissions trends over time and helps you identify patterns and improvement opportunities in your sustainability journey.',
    target: 'emissions-chart',
    position: 'left'
  },
  {
    id: 'product-catalog',
    title: 'Product Catalog',
    content: 'Manage your product SKUs and track individual product footprints. This is crucial as consumers increasingly want product-level sustainability information.',
    target: 'products-section',
    position: 'top'
  },
  {
    id: 'supplier-database',
    title: 'Supplier Database',
    content: 'Collaborate with your suppliers to collect their environmental data. Supply chain emissions often make up the largest portion of your total footprint.',
    target: 'suppliers-section',
    position: 'top'
  },
  {
    id: 'reports',
    title: 'Reports',
    content: 'Generate comprehensive sustainability reports for stakeholders, compliance, and certification programs. Track your report generation status here.',
    target: 'reports-section',
    position: 'left'
  },
  {
    id: 'sidebar',
    title: 'Navigation Menu',
    content: 'Use this sidebar to navigate between different sections of your sustainability platform. Each section provides detailed tools for specific tasks.',
    target: 'sidebar-nav',
    position: 'right'
  }
];

interface DashboardTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function DashboardTour({ onComplete, onSkip }: DashboardTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [tourPosition, setTourPosition] = useState({ top: 0, left: 0 });

  const currentTourStep = tourSteps[currentStep];

  useEffect(() => {
    // Add tour overlay class to body
    document.body.classList.add('tour-active');
    
    return () => {
      document.body.classList.remove('tour-active');
    };
  }, []);

  useEffect(() => {
    // Calculate position for tour card based on target element
    const calculatePosition = () => {
      const targetElement = document.getElementById(currentTourStep.target);
      if (!targetElement) return;

      const rect = targetElement.getBoundingClientRect();
      const cardWidth = 384; // w-96 = 384px
      const cardHeight = 200; // approximate height
      const offset = 20;

      let top = 0;
      let left = 0;

      switch (currentTourStep.position) {
        case 'top':
          top = rect.top - cardHeight - offset;
          left = rect.left + (rect.width - cardWidth) / 2;
          break;
        case 'bottom':
          top = rect.bottom + offset;
          left = rect.left + (rect.width - cardWidth) / 2;
          break;
        case 'left':
          top = rect.top + (rect.height - cardHeight) / 2;
          left = rect.left - cardWidth - offset;
          break;
        case 'right':
          top = rect.top + (rect.height - cardHeight) / 2;
          left = rect.right + offset;
          break;
      }

      // Ensure card stays within viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (left < 20) left = 20;
      if (left + cardWidth > viewportWidth - 20) left = viewportWidth - cardWidth - 20;
      if (top < 20) top = 20;
      if (top + cardHeight > viewportHeight - 20) top = viewportHeight - cardHeight - 20;

      setTourPosition({ top, left });

      // Add spotlight effect to target element
      targetElement.style.position = 'relative';
      targetElement.style.zIndex = '60';
      targetElement.style.borderRadius = '8px';
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    
    return () => {
      window.removeEventListener('resize', calculatePosition);
      // Clean up previous target styling
      const prevTarget = document.getElementById(currentTourStep.target);
      if (prevTarget) {
        prevTarget.style.position = '';
        prevTarget.style.zIndex = '';
        prevTarget.style.borderRadius = '';
      }
    };
  }, [currentStep, currentTourStep.target, currentTourStep.position]);

  const handleNext = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    document.body.classList.remove('tour-active');
    onComplete();
  };

  const handleSkip = () => {
    setIsVisible(false);
    document.body.classList.remove('tour-active');
    onSkip();
  };

  if (!isVisible) return null;

  const getArrowClass = () => {
    switch (currentTourStep.position) {
      case 'top':
        return 'tour-arrow-down';
      case 'bottom':
        return 'tour-arrow-up';
      case 'left':
        return 'tour-arrow-right';
      case 'right':
        return 'tour-arrow-left';
      default:
        return '';
    }
  };

  return (
    <>
      {/* Tour overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40 tour-overlay" />

      {/* Tour card */}
      <div 
        className="fixed z-50 tour-card"
        style={{
          top: `${tourPosition.top}px`,
          left: `${tourPosition.left}px`,
          transition: 'all 0.3s ease'
        }}
      >
        <Card className={`w-96 border-avallen-green shadow-xl relative ${getArrowClass()}`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-avallen-green" />
                <CardTitle className="text-lg font-semibold text-slate-gray">
                  {currentTourStep.title}
                </CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Badge variant="outline" className="w-fit">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
          </CardHeader>
          
          <CardContent className="pb-6">
            <p className="text-gray-600 mb-6 leading-relaxed">
              {currentTourStep.content}
            </p>
            
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Skip Tour
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-avallen-green hover:bg-avallen-green-light text-white flex items-center gap-2"
                >
                  {currentStep === tourSteps.length - 1 ? 'Finish Tour' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}