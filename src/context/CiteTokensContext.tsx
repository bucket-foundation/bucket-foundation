import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { CiteToken, CiteTokenCreate } from '@/types';
import { useAuthor } from './AuthorContext';

interface CiteTokenContextType {
  loading: boolean;
  citeTokens: CiteToken[] | null;
  createCiteToken: (authorId: number, researchId: number) => Promise<void>;
}

const CiteTokenContext = createContext<CiteTokenContextType | undefined>(undefined);

export const CiteTokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [citeTokens, setCiteTokens] = useState<CiteToken[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { author } = useAuthor();

  useEffect(() => {
    const fetchCiteTokens = async () => {
      setLoading(true);
      try {
        if (author) {
          const { data, error } = await supabase
            .from('cite_tokens')
            .select('*')
            .eq('author_id', author.id);

          if (error) {
            console.error(error);
            setCiteTokens(null);
          } else {
            setCiteTokens(data);
          }
        } else {
          setCiteTokens(null);
        }
      } catch (error) {
        console.error(error);
        setCiteTokens(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCiteTokens();
  }, [author]);

  const createCiteToken = async (authorId: number, researchId: number) => {
    try {

      let createCiteToken: CiteTokenCreate = {
        author_id: authorId,
        research_id: researchId
      }

      const { data, error } = await supabase
        .from('cite_tokens')
        .insert(createCiteToken)
        .select()

      if (error) {
        console.error('Error creating cite token:', error);
        return;
      }

      // Optionally, update local state with the new cite token
      setCiteTokens((prev) => (prev ? [...prev, ...data] : data));
    } catch (error) {
      console.error('Error during cite token creation:', error);
    }
  };

  return (
    <CiteTokenContext.Provider value={{ citeTokens, loading, createCiteToken }}>
      {children}
    </CiteTokenContext.Provider>
  );
};

export const useCiteToken = () => {
  const context = useContext(CiteTokenContext);
  if (!context) {
    throw new Error('useCiteToken must be used within a CiteTokenProvider');
  }
  return context;
};

