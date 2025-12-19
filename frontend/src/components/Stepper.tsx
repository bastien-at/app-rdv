import React from 'react';
import { Check } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  status: 'upcoming' | 'current' | 'completed';
}

interface StepperProps {
  steps: Step[];
  className?: string;
}

export default function Stepper({ steps, className = '' }: StepperProps) {
  return (
    <div className={`flex w-full items-start justify-between gap-4 ${className}`}>
      {steps.map((step) => (
        <div key={step.id} className="flex flex-col w-full group">
          {/* Bar */}
          <div className="relative h-1 w-full mb-4 flex items-center">
            <div className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
              step.status === 'upcoming' 
                ? 'bg-gray-200' 
                : step.status === 'current'
                  ? 'bg-blue-200' 
                  : 'bg-blue-500' 
            }`} />
          </div>

          {/* Label Section */}
          <div className="flex items-center justify-center gap-2">
            <span className={`text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
               step.status === 'upcoming'
                 ? 'text-gray-500'
                 : step.status === 'current'
                 ? 'text-blue-500'
                 : 'text-blue-500 underline decoration-solid underline-offset-4'
            }`}>
              {step.label}
            </span>
             
            {/* Finish Circle */}
            {step.status === 'completed' && (
              <div className="flex-shrink-0 flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 animate-in fade-in zoom-in duration-300">
                <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
