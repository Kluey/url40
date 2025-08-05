import React from 'react';
import { FileText, Circle, Dot, CheckCircle, Info, Target } from 'lucide-react';

interface SummaryRendererProps {
  content: string;
}

export const SummaryRenderer: React.FC<SummaryRendererProps> = ({ content }) => {
  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4 transition-colors" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">No summary yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
          Summary will appear here after processing the article
        </p>
      </div>
    );
  }

  const lines = content.split('\n').filter(line => line.trim());

  const renderLine = (line: string, index: number) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return null;
    
    // Handle section headers (## or ###)
    if (trimmedLine.match(/^#{2,3}\s+/)) {
      const headerText = trimmedLine.replace(/^#{2,3}\s+/, '');
      const isMainHeader = trimmedLine.startsWith('## ');
      
      // Determine section icon based on header text
      let SectionIcon = Circle;
      let iconColor = 'text-slate-500 dark:text-slate-400';
      
      if (headerText.toLowerCase().includes('key points')) {
        SectionIcon = CheckCircle;
        iconColor = 'text-emerald-600 dark:text-emerald-400';
      } else if (headerText.toLowerCase().includes('important details')) {
        SectionIcon = Info;
        iconColor = 'text-blue-600 dark:text-blue-400';
      } else if (headerText.toLowerCase().includes('takeaways')) {
        SectionIcon = Target;
        iconColor = 'text-purple-600 dark:text-purple-400';
      } else if (headerText.toLowerCase().includes('main content')) {
        SectionIcon = FileText;
        iconColor = 'text-gray-600 dark:text-gray-400';
      }
      
      return (
        <div key={index} className={`${isMainHeader ? 'mb-4 mt-6' : 'mb-3 mt-4'} first:mt-0`}>
          <h4 className={`${
            isMainHeader 
              ? 'text-lg font-bold text-gray-900 dark:text-gray-50' 
              : 'text-base font-semibold text-gray-800 dark:text-gray-200'
          } flex items-center border-b border-gray-200 dark:border-gray-700 pb-2 transition-colors`}>
            <SectionIcon className={`w-4 h-4 mr-3 ${iconColor} transition-colors`} />
            {headerText}
          </h4>
        </div>
      );
    }
    
    // Handle bullet points (- bullets)
    if (trimmedLine.match(/^[-•]\s+/)) {
      const text = trimmedLine.replace(/^[-•]\s*/, '');
      
      // Process bold formatting within bullet points
      const processedText = text.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold text-gray-900 dark:text-gray-50 transition-colors">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <div key={index} className="flex items-start mb-3">
          <Dot className="w-5 h-5 text-slate-500 dark:text-slate-400 mr-2 mt-0.5 flex-shrink-0 transition-colors" />
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
            {processedText}
          </div>
        </div>
      );
    }
    
    // Handle regular paragraphs with bold formatting
    if (trimmedLine && !trimmedLine.match(/^[#\-•*]/)) {
      // Process bold formatting
      const processedText = trimmedLine.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold text-gray-900 dark:text-gray-50 transition-colors">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <div key={index} className="mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
            {processedText}
          </p>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const renderedLine = renderLine(line, index);
        // Add extra spacing after headers
        if (line.trim().match(/^#{2,3}\s+/)) {
          return (
            <div key={index}>
              {renderedLine}
              <div className="mb-2"></div>
            </div>
          );
        }
        return renderedLine;
      })}
    </div>
  );
};
