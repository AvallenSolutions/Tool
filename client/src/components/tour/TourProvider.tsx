import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import TourService, { TourStep } from '../../services/TourService';
import tourContent from '../../data/tourContent.json';

interface TourContextType {
  startTour: () => void;
  cancelTour: () => void;
  completeTour: () => void;
  isActive: boolean;
  currentStep: number;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (context === undefined) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: React.ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const [tourService] = useState(() => new TourService());
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Load tour steps from JSON content
    const steps: TourStep[] = tourContent.tourSteps.map((step, index) => ({
      id: step.id,
      title: step.title,
      text: step.text,
      attachTo: step.attachTo,
      buttons: step.buttons.map((button) => ({
        text: button.text,
        classes: button.classes,
        action: () => {
          switch (button.action) {
            case 'next':
              if (index < tourContent.tourSteps.length - 1) {
                setCurrentStep(index + 1);
              }
              tourService.tour?.next();
              break;
            case 'back':
              if (index > 0) {
                setCurrentStep(index - 1);
              }
              tourService.tour?.back();
              break;
            case 'cancel':
              cancelTour();
              break;
            case 'complete':
              completeTour();
              break;
          }
        },
      })),
    }));

    tourService.loadSteps(steps);
  }, [tourService]);

  const startTour = useCallback(() => {
    setIsActive(true);
    setCurrentStep(0);
    tourService.startTour();
  }, [tourService]);

  const cancelTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    tourService.cancelTour();
  }, [tourService]);

  const completeTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    tourService.completeTour();
  }, [tourService]);

  const value: TourContextType = {
    startTour,
    cancelTour,
    completeTour,
    isActive,
    currentStep,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};