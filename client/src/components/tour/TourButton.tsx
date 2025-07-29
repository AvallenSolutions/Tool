import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { HelpCircle, Play, BookOpen } from 'lucide-react';
import { useTour } from './TourProvider';

interface TourButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const TourButton: React.FC<TourButtonProps> = ({ 
  className = '', 
  variant = 'outline',
  size = 'sm'
}) => {
  const { startTour, isActive } = useTour();
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    // Add pulsing effect for first-time users
    const hasSeenTour = localStorage.getItem('lca-tour-completed');
    if (!hasSeenTour && !isActive) {
      setIsPulsing(true);
      // Stop pulsing after 10 seconds
      const timer = setTimeout(() => setIsPulsing(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [isActive]);

  if (isActive) {
    return null; // Hide button when tour is active
  }

  const handleStartTour = () => {
    console.log('Starting LCA Tour');
    startTour();
    setIsPulsing(false);
  };

  return (
    <Button
      onClick={handleStartTour}
      variant={variant}
      size={size}
      className={`
        flex items-center gap-2 
        bg-green-50 hover:bg-green-100 
        border-green-200 hover:border-green-300
        text-green-700 hover:text-green-800
        font-medium transition-all duration-300
        ${isPulsing ? 'animate-pulse shadow-lg shadow-green-200' : ''}
        ${className}
      `}
    >
      <BookOpen className="w-4 h-4" />
      Take Guided Tour
    </Button>
  );
};

export default TourButton;