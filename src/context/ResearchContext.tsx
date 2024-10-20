import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Research } from '@/types';

interface ResearchContextType {
  loading: boolean;
  research: Research[] | null;
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [research, setResearch] = useState<Research[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchResearch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('research') // Ensure the table name matches your database
          .select('*');

        if (error) {
          console.error(error);
          setResearch(null);
        } else {
          setResearch(data);
        }
      } catch (error) {
        console.error(error);
        setResearch(null);
      } finally {
        setLoading(false);
      }
    };

    fetchResearch();
  }, []);

  return (
    <ResearchContext.Provider value={{ research, loading }}>
      {children}
    </ResearchContext.Provider>
  );
};

export const useResearch = () => {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch must be used within a ResearchProvider');
  }
  return context;
};
