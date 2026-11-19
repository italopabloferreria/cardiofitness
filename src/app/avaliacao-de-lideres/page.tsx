import { PublicEvaluationForm } from '@/components/public-evaluation-form';

export const dynamic = 'force-dynamic';

export default function AvaliacaoDeLideresPage() {
  return <PublicEvaluationForm forcedKind="leadership" />;
}
