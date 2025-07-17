interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export default function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-gray">Progress</span>
        <span className="text-sm text-gray-500">
          {currentStep} of {totalSteps} steps
        </span>
      </div>
      <div className="w-full bg-light-gray rounded-full h-2">
        <div
          className="bg-avallen-green h-2 rounded-full transition-all duration-300 ease-in-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
    </div>
  );
}
