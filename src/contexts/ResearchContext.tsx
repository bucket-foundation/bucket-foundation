// ResearchContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/utils/supabaseClient'; // Adjust the import based on your project structure

// types.ts
export interface Research {
  id: number;
  created_at: string; // or Date, depending on how you want to handle it
  title: string;
  description: string;
  blob_id: string;
  txn_hash: string;
}

interface ResearchContextType {
  research: Research[];
  loading: boolean;
  error: string | null;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [research, setResearch] = useState<Research[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResearch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('research').select();
        if (error) throw error;
        setResearch(data as Research[]); // Type assertion
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchResearch();
  }, []);

  return (
    <ResearchContext.Provider value={{ research, loading, error }}>
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = (): ResearchContextType => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};

