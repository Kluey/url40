export interface NotesResponse {
  result: string;
}

export const useGetBulletedNotesMutation = () => {
  const getBulletedNotes = async (summary: string) => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ summary }),
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
    } catch (networkError) {
      console.error('Network error:', networkError);
      return { 
        data: null, 
        error: { 
          data: { error: 'Network error occurred' },
          status: 500 
        } 
      };
    }
  };

  return [getBulletedNotes, { error: null, isLoading: false }] as const;
};
