import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text 
}) => {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      <FontAwesomeIcon 
        icon={faSpinner} 
        spin 
        className={`text-red-600 dark:text-red-400 mb-3 ${sizeClasses[size]}`} 
      />
      {text && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">{text}</p>
      )}
    </div>
  );
};
