// Server Component
import { createClient } from '@/utils/server';
import { cookies } from 'next/headers';
import ReadClient from '@/components/ReadClient';

export default async function Page() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);
  const { data: research } = await supabase.from('research').select();
  const { data: ip_metadata } = await supabase.from('ip_metadata').select();

  return (
    <main>
      <ReadClient research={research} ip_metadata={ip_metadata} />
    </main>
  );
}

