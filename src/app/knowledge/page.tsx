// Server Component
import { createClient } from '@/utils/server';
import { cookies } from 'next/headers';
import KnowledgeDisplay from '@/components/KnowledgeDisplay';
import ReadClient from '@/components/ReadClient';

export default async function Page() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: research } = await supabase.from('research').select();

  return (
    <main>
      <ReadClient research={research} />
    </main>
  );
}

