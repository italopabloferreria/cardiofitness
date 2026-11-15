import Link from 'next/link';
import Application from '@/components/application';
import { NativeRhPreview } from '@/components/native-prototype';
import { requireRh } from '@/lib/server/supabase';

export default async function Home() {
  try {
    await requireRh();
  } catch {
    return <Application />;
  }

  return <>
    <aside aria-label="Dados oficiais" style={{padding:'12px 24px',background:'#fff',borderBottom:'1px solid #dbe5ef'}}>
      <Link href="/historico">Abrir avaliações oficiais, links de compartilhamento e histórico do RH</Link>
    </aside>
    <NativeRhPreview />
  </>;
}
