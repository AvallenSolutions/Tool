import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import TourService, { TourStep } from '../../services/TourService';
import { enhancedTourContent } from '../../data/enhancedTourContent';

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
    // Load tour steps from enhanced content
    console.log('Loading enhanced tour content:', enhancedTourContent.tourSteps);
    tourService.loadSteps(enhancedTourContent.tourSteps);
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