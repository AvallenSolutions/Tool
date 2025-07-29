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
        bg-gradient-to-r from-green-50 to-green-100
        hover:from-green-100 hover:to-green-200
        border-green-200 hover:border-green-300
        text-green-700 hover:text-green-800
        font-semibold transition-all duration-500
        shadow-md hover:shadow-lg
        transform hover:scale-105
        ${isPulsing ? 'animate-bounce shadow-xl shadow-green-200' : ''}
        ${className}
      `}
    >
      <BookOpen className={`w-4 h-4 transition-transform duration-300 ${isPulsing ? 'animate-spin' : ''}`} />
      <span className="relative">
        Take Guided Tour
        {isPulsing && (
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
        )}
      </span>
    </Button>
  );
};

export default TourButton;