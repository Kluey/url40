import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorMessageProps {
  title: string;
  message: string;
  onDismiss?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ 
  title, 
  message, 
  onDismiss 
}) => {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 m-4">
      <div className="flex items-start">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">{title}</h3>
          <p className="text-sm text-red-700 dark:text-red-300">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 p-1 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-red-600 dark:text-red-400" />
          </button>
        )}
      </div>
    </div>
  );
};
