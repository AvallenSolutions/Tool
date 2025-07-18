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
    position: 'right'
  },
  {
    id: 'product-catalog',
    title: 'Product Catalog',
    content: 'Manage your product SKUs and track individual product footprints. This is crucial as consumers increasingly want product-level sustainability information.',
    target: 'products-section',
    position: 'left'
  },
  {
    id: 'supplier-database',
    title: 'Supplier Database',
    content: 'Collaborate with your suppliers to collect their environmental data. Supply chain emissions often make up the largest portion of your total footprint.',
    target: 'suppliers-section',
    position: 'left'
  },
  {
    id: 'reports',
    title: 'Reports',
    content: 'Generate comprehensive sustainability reports for stakeholders, compliance, and certification programs. Track your report generation status here.',
    target: 'reports-section',
    position: 'right'
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
  const [cardPosition, setCardPosition] = useState({ top: '50%', left: 'auto', right: '2rem', bottom: 'auto' });

  const currentTourStep = tourSteps[currentStep];

  useEffect(() => {
    // Add tour overlay class to body
    document.body.classList.add('tour-active');
    
    return () => {
      document.body.classList.remove('tour-active');
      // Remove any existing highlights
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight');
      });
    };
  }, []);

  useEffect(() => {
    // Remove previous highlights
    document.querySelectorAll('.tour-highlight').forEach(el => {
      el.classList.remove('tour-highlight');
    });
    
    // Add highlight to current target and position card
    const targetElement = document.getElementById(currentTourStep.target);
    if (targetElement) {
      targetElement.classList.add('tour-highlight');
      
      // Scroll to element smoothly
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest' 
      });
      
      // Position the card to avoid covering the target
      setTimeout(() => {
        const rect = targetElement.getBoundingClientRect();
        const cardWidth = 400;
        const cardHeight = 350;
        const padding = 20;
        
        let newPosition = { top: '50%', left: 'auto', right: '2rem', bottom: 'auto' };
        
        // Calculate available space
        const spaceRight = window.innerWidth - rect.right;
        const spaceLeft = rect.left;
        const spaceTop = rect.top;
        const spaceBottom = window.innerHeight - rect.bottom;
        
        // Position based on available space
        if (spaceRight >= cardWidth + padding) {
          // Position to the right
          newPosition = {
            top: Math.max(padding, Math.min(rect.top, window.innerHeight - cardHeight - padding)) + 'px',
            left: (rect.right + padding) + 'px',
            right: 'auto',
            bottom: 'auto'
          };
        } else if (spaceLeft >= cardWidth + padding) {
          // Position to the left
          newPosition = {
            top: Math.max(padding, Math.min(rect.top, window.innerHeight - cardHeight - padding)) + 'px',
            left: Math.max(padding, rect.left - cardWidth - padding) + 'px',
            right: 'auto',
            bottom: 'auto'
          };
        } else if (spaceTop >= cardHeight + padding) {
          // Position above
          newPosition = {
            top: Math.max(padding, rect.top - cardHeight - padding) + 'px',
            left: '50%',
            right: 'auto',
            bottom: 'auto'
          };
        } else if (spaceBottom >= cardHeight + padding) {
          // Position below
          newPosition = {
            top: (rect.bottom + padding) + 'px',
            left: '50%',
            right: 'auto',
            bottom: 'auto'
          };
        } else {
          // Default to top-right corner if no good space
          newPosition = {
            top: padding + 'px',
            left: 'auto',
            right: padding + 'px',
            bottom: 'auto'
          };
        }
        
        setCardPosition(newPosition);
      }, 100);
    }
  }, [currentStep, currentTourStep.target]);

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

  return (
    <>
      {/* Tour overlay - dark background */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-40 tour-overlay" />
      
      {/* Tour card */}
      <div 
        className="fixed z-50 max-w-md"
        style={{
          top: cardPosition.top,
          left: cardPosition.left,
          right: cardPosition.right,
          bottom: cardPosition.bottom,
          transform: cardPosition.left === '50%' ? 'translateX(-50%)' : 'none',
          animation: 'slideIn 0.3s ease',
          minWidth: '400px',
          maxWidth: '400px'
        }}
      >
        <Card className="w-full bg-white border-2 border-avallen-green shadow-2xl">
          <CardHeader className="pb-3 bg-lightest-gray">
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
            <Badge variant="outline" className="w-fit border-avallen-green text-avallen-green">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
          </CardHeader>
          
          <CardContent className="pb-6 bg-white">
            <p className="text-slate-gray mb-6 leading-relaxed font-medium">
              {currentTourStep.content}
            </p>
            
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="flex items-center gap-2 border-light-gray"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-avallen-green hover:bg-green-600 text-white flex items-center gap-2 px-6 py-2 font-medium opacity-100 visible"
                  style={{ backgroundColor: 'hsl(var(--avallen-green))', color: 'white' }}
                >
                  {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
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