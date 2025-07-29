import React from 'react';
import { TourProvider } from './TourProvider';
import { TourButton } from './TourButton';

// Simple test component to validate tour functionality
export const TourTest: React.FC = () => {
  return (
    <TourProvider>
      <div className="p-8">
        <h1>Tour Test Component</h1>
        <div className="mt-4">
          <TourButton />
        </div>
        
        {/* Test elements for tour targeting */}
        <div className="mt-8 space-y-4">
          <input name="lcaData.agriculture.mainCrop.cropType" placeholder="Test Field 1" className="border p-2" />
          <input name="lcaData.agriculture.mainCrop.yieldTonPerHectare" placeholder="Test Field 2" className="border p-2" />
          <input name="lcaData.agriculture.mainCrop.dieselLPerHectare" placeholder="Test Field 3" className="border p-2" />
        </div>
      </div>
    </TourProvider>
  );
};

export default TourTest;