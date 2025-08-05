import React from 'react';
import { BookOpen, Circle, Dot, ChevronRight, Star, Quote, CheckCircle, Info, Target, FileText } from 'lucide-react';

interface NoteRendererProps {
  content: string;
}

export const NoteRenderer: React.FC<NoteRendererProps> = ({ content }) => {
  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4 transition-colors" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 transition-colors">No notes yet</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">
          Notes will appear here after the summary is generated
        </p>
      </div>
    );
  }

  const lines = content.split('\n').filter(line => line.trim());

  const renderLine = (line: string, index: number) => {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) return null;
    
    // Handle main headers (## or ###)
    if (trimmedLine.match(/^#{2,3}\s+/)) {
      const headerText = trimmedLine.replace(/^#{2,3}\s+/, '');
      const isMainHeader = trimmedLine.startsWith('## ');
      
      // Determine section icon and color based on header text
      let SectionIcon = Circle;
      let iconColor = 'text-slate-500 dark:text-slate-400';
      
      if (headerText.toLowerCase().includes('key takeaways')) {
        SectionIcon = Star;
        iconColor = 'text-amber-600 dark:text-amber-400';
      } else if (headerText.toLowerCase().includes('main points')) {
        SectionIcon = CheckCircle;
        iconColor = 'text-emerald-600 dark:text-emerald-400';
      } else if (headerText.toLowerCase().includes('supporting details')) {
        SectionIcon = Info;
        iconColor = 'text-blue-600 dark:text-blue-400';
      } else if (headerText.toLowerCase().includes('action items')) {
        SectionIcon = Target;
        iconColor = 'text-purple-600 dark:text-purple-400';
      } else if (headerText.toLowerCase().includes('summary')) {
        SectionIcon = FileText;
        iconColor = 'text-rose-600 dark:text-rose-400';
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
    
    // Handle bold headers (**Text**)
    if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
      const headerText = trimmedLine.slice(2, -2);
      return (
        <div key={index} className="mb-4 mt-6 first:mt-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-50 flex items-center border-b border-gray-200 dark:border-gray-700 pb-2 transition-colors">
            <Circle className="w-3 h-3 mr-3 text-slate-500 dark:text-slate-400 transition-colors" />
            {headerText}
          </h4>
        </div>
      );
    }
    
    // Handle numbered lists (1. 2. etc.)
    if (trimmedLine.match(/^\d+\.\s+/)) {
      const number = trimmedLine.match(/^(\d+)/)?.[1] || '1';
      const text = trimmedLine.replace(/^\d+\.\s+/, '');
      
      // Check if the text contains **bold** formatting
      const boldPattern = /\*\*(.*?)\*\*/g;
      if (text.includes('**')) {
        const parts = text.split(boldPattern);
        return (
          <div key={index} className="flex items-start mb-4 ml-2">
            <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-600 dark:bg-slate-500 text-white text-xs font-bold rounded-full mr-3 mt-0.5 flex-shrink-0 transition-colors">
              {number}
            </span>
            <div className="flex-1">
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium transition-colors">
                {parts.map((part, partIndex) => 
                  partIndex % 2 === 1 ? (
                    <strong key={partIndex} className="font-bold text-gray-900 dark:text-gray-50 transition-colors">
                      {part}
                    </strong>
                  ) : (
                    <span key={partIndex}>{part}</span>
                  )
                )}
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div key={index} className="flex items-start mb-3 ml-2">
          <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-600 dark:bg-slate-500 text-white text-xs font-bold rounded-full mr-3 mt-0.5 flex-shrink-0 transition-colors">
            {number}
          </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium transition-colors">
            {text}
          </span>
        </div>
      );
    }
    
    // Handle main bullet points (- or •)
    if (trimmedLine.match(/^[-•]\s+/) && !trimmedLine.match(/^\s{2,}[-•]/)) {
      const text = trimmedLine.substring(2).trim();
      
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
    
    // Handle sub-bullets (indented with spaces)
    if (trimmedLine.match(/^\s{2,}[-•]\s+/)) {
      const indentLevel = Math.floor(trimmedLine.search(/[^\s]/) / 2);
      const text = trimmedLine.replace(/^\s*[-•]\s+/, '');
      
      // Process bold formatting within sub-bullets
      const processedText = text.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold text-gray-800 dark:text-gray-200 transition-colors">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <div key={index} className={`flex items-start mb-2 ${indentLevel > 1 ? 'ml-10' : 'ml-8'}`}>
          <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full mr-3 mt-2 flex-shrink-0 transition-colors"></div>
          <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed transition-colors">
            {processedText}
          </div>
        </div>
      );
    }
    
    // Handle key points or highlights (starting with *)
    if (trimmedLine.startsWith('*') && !trimmedLine.startsWith('**')) {
      const text = trimmedLine.substring(1).trim();
      
      // Process bold formatting within highlights
      const processedText = text.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-bold text-amber-900 dark:text-amber-100 transition-colors">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <div key={index} className="mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 dark:border-amber-400 rounded-r transition-colors">
          <div className="flex items-start">
            <Star className="w-4 h-4 text-amber-600 dark:text-amber-400 mr-2 mt-0.5 flex-shrink-0 transition-colors" />
            <div className="text-sm font-medium text-amber-800 dark:text-amber-200 transition-colors">
              {processedText}
            </div>
          </div>
        </div>
      );
    }
    
    // Handle quotes or important statements (starting with >)
    if (trimmedLine.startsWith('>')) {
      const text = trimmedLine.substring(1).trim();
      
      // Process bold formatting within quotes
      const processedText = text.split(/(\*\*[^*]+\*\*)/).map((part, partIndex) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={partIndex} className="font-semibold text-gray-700 dark:text-gray-300 transition-colors">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={partIndex}>{part}</span>;
      });
      
      return (
        <blockquote key={index} className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 border-l-4 border-gray-400 dark:border-gray-600 rounded-r transition-colors">
          <div className="flex items-start">
            <Quote className="w-4 h-4 text-gray-500 dark:text-gray-400 mr-2 mt-0.5 flex-shrink-0 transition-colors" />
            <div className="text-sm text-gray-600 dark:text-gray-400 italic leading-relaxed transition-colors">
              {processedText}
            </div>
          </div>
        </blockquote>
      );
    }
    
    // Handle bold text within paragraphs
    if (trimmedLine.includes('**')) {
      const parts = trimmedLine.split(/(\*\*[^*]+\*\*)/);
      return (
        <div key={index} className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
            {parts.map((part, partIndex) => 
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={partIndex} className="font-semibold text-gray-900 dark:text-gray-50 transition-colors">
                  {part.slice(2, -2)}
                </strong>
              ) : (
                <span key={partIndex}>{part}</span>
              )
            )}
          </p>
        </div>
      );
    }
    
    // Handle regular paragraphs
    if (trimmedLine && !trimmedLine.match(/^[-•*>]/)) {
      return (
        <div key={index} className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed transition-colors">
            {trimmedLine}
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
