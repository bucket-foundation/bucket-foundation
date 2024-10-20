import { Author } from "@/lib/types";
import { useDynamicContext, Wallet } from '@dynamic-labs/sdk-react-core';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client'

interface AuthorContextType {
  loading: boolean,
  author: Author | null,
  wallet: Wallet | null
}

const AuthorContext = createContext<AuthorContextType | undefined>(undefined);

export const AuthorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { primaryWallet } = useDynamicContext();
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const upsertAuthor = async () => {
      if (primaryWallet) {
        setLoading(true);

        try {
          // Check if the author already exists
          const { data: existingAuthors, error: fetchError } = await supabase
            .from('author')
            .select('*')
            .eq('wallet_address', primaryWallet.address)
            .maybeSingle();

          if (fetchError && fetchError.message !== 'No rows found') {
            console.error(fetchError);
            setAuthor(null);
          } else if (existingAuthors) {
            // Author exists, set it
            setAuthor(existingAuthors);
          } else {
            // Author does not exist, create a new one
            const { data: createdAuthor, error: createError } = await supabase
              .from('author')
              .upsert(
                {
                  wallet_address: primaryWallet.address,
                  first_name: 'Anon',
                  last_name: 'John',
                },
                { onConflict: 'wallet_address' }
              );

            if (createError) {
              console.error(createError);
              setAuthor(null);
            } else {
              setAuthor(createdAuthor![0]);
            }
          }
        } catch (error) {
          console.error(error);
          setAuthor(null);
        } finally {
          setLoading(false);
        }
      } else {
        setAuthor(null);
        setLoading(false);
      }
    };

    upsertAuthor();
  }, [primaryWallet]);

  return (
    <AuthorContext.Provider value={{ author, loading, wallet: primaryWallet }}>
      {children}
    </AuthorContext.Provider>
  );
};

export const useAuthor = () => {
  const context = useContext(AuthorContext);
  if (!context) {
    throw new Error('useAuthor must be used within an AuthorProvider');
  }
  return context;
};


