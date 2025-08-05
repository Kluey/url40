export interface SummaryResponse {
  summary: string;
  wordCount: number;
}

export interface SummaryRequest {
  articleUrl: string;
}

export const useLazyGetSummaryQuery = () => {
  const getSummary = async ({ articleUrl }: SummaryRequest) => {
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: articleUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return { 
          data: null, 
          error: { 
            data: errorData,
            status: response.status 
          } 
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      return { 
        data: null, 
        error: { 
          data: { error: 'Network error occurred' },
          status: 500 
        } 
      };
    }
  };

  return [getSummary, { error: null, isFetching: false }] as const;
};
