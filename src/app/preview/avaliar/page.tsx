import type { Metadata } from 'next';
import { NativeEvaluationPreview } from '@/components/native-prototype';
export const metadata: Metadata = {
  title: 'Prévia · Portal de avaliações | Cardiofitness',
  description: 'Prévia de interface do portal permanente de avaliações — sem gravação de respostas.',
  robots: { index: false, follow: false },
};
export default function NativeEvaluationPreviewPage() { return <NativeEvaluationPreview/>; }
