import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  isDark: boolean;
  onToggle: () => void;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="relative flex items-center w-16 h-8 bg-gray-200 dark:bg-gray-700 rounded-full p-1 transition-all duration-300 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-slate-500 dark:focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {/* Background track indicators */}
      <div className="absolute inset-1 flex items-center justify-between px-1">
        <Sun className={`w-3 h-3 transition-opacity duration-300 ${isDark ? 'opacity-30 text-gray-400' : 'opacity-70 text-yellow-600'}`} />
        <Moon className={`w-3 h-3 transition-opacity duration-300 ${isDark ? 'opacity-70 text-blue-400' : 'opacity-30 text-gray-400'}`} />
      </div>
      
      {/* Sliding toggle */}
      <div
        className={`relative w-6 h-6 bg-white dark:bg-gray-100 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-10 ${
          isDark ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="w-3 h-3 text-slate-700" />
        ) : (
          <Sun className="w-3 h-3 text-amber-600" />
        )}
      </div>
    </button>
  );
};
