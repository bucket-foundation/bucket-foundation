import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Research } from '@/lib/types';

export interface CiteResearch {
  id: number;
  research_id: number | null;
  cite_token_id: number | null;
}

interface ResearchContextType {
  loading: boolean;
  research: Research[] | null;
  citations: CiteResearch[] | null; // Add citations as a separate field
}

const ResearchContext = createContext<ResearchContextType | undefined>(undefined);

export const ResearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [research, setResearch] = useState<Research[] | null>(null);
  const [citations, setCitations] = useState<CiteResearch[] | null>(null); // State for citations
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchResearch = async () => {
      setLoading(true);
      try {
        // Fetch research data
        const { data: researchData, error: researchError } = await supabase
          .from('research')
          .select('*');

        if (researchError) {
          console.error(researchError);
          setResearch(null);
        } else {
          setResearch(researchData);
        }

        // Fetch research citations
        const { data: citationsData, error: citationsError } = await supabase
          .from('research_cite')
          .select('*');

        if (citationsError) {
          console.error(citationsError);
          setCitations(null);
        } else {
          setCitations(citationsData);
        }
      } catch (error) {
        console.error(error);
        setResearch(null);
        setCitations(null);
      } finally {
        setLoading(false);
      }
    };

    fetchResearch();
  }, []);

  return (
    <ResearchContext.Provider value={{ research, citations, loading }}>
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

