import { useState, useCallback } from 'react';

interface CopyState {
  [key: string]: boolean;
}

export const useCopyToClipboard = () => {
  const [copiedStates, setCopiedStates] = useState<CopyState>({});

  const copyToClipboard = useCallback(async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      
      if (id) {
        setCopiedStates(prev => ({ ...prev, [id]: true }));
        
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedStates(prev => ({ ...prev, [id]: false }));
        }, 2000);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, []);

  const isCopied = useCallback((id: string) => {
    return copiedStates[id] || false;
  }, [copiedStates]);

  return { copyToClipboard, isCopied };
};
