import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';
import { ExternalLink } from 'lucide-react';

interface ArticleCardProps {
  url: string;
  summary: string;
  notes: string;
  onClick: () => void;
  onCopy: () => void;
  isCopied: boolean;
}

export const ArticleCard: React.FC<ArticleCardProps> = ({
  url,
  summary,
  notes,
  onClick,
  onCopy,
  isCopied
}) => {
  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const getPreview = (text: string, maxLength: number = 100) => {
    if (!text) return 'No summary available';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div
      className="group bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md dark:hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-red-200 dark:hover:border-red-600"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {getDomain(url)}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Copy URL"
        >
          <FontAwesomeIcon
            icon={isCopied ? faCheck : faCopy}
            className={`w-4 h-4 ${isCopied ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}
          />
        </button>
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
        {getPreview(summary)}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{notes ? 'Summary & Notes' : 'Summary only'}</span>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity">
          Click to view →
        </span>
      </div>
    </div>
  );
};
