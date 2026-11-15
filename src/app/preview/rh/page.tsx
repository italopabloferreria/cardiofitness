import type { Metadata } from 'next';
import { NativeRhPreview } from '@/components/native-prototype';
export const metadata: Metadata = {
  title: 'Prévia · Novo dashboard do RH | Cardiofitness',
  description: 'Protótipo de interface para ciclos automáticos e avaliações nativas.',
  robots: { index: false, follow: false },
};
export default function NativeRhPreviewPage() { return <NativeRhPreview/>; }
