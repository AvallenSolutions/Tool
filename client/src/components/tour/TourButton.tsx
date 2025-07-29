import React from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { useTour } from './TourProvider';

interface TourButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TourButton: React.FC<TourButtonProps> = ({ 
  className = '', 
  variant = 'outline',
  size = 'default'
}) => {
  const { startTour, isActive } = useTour();

  if (isActive) {
    return null; // Hide button when tour is active
  }

  return (
    <Button
      onClick={startTour}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      <HelpCircle className="w-4 h-4" />
      Need help? Start Guided Tour
    </Button>
  );
};

export default TourButton;