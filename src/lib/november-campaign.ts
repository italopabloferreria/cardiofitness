import type { Cycle, EvaluationKind } from './types';

/**
 * Regra específica da coleta de novembro/2026. O RH compartilha apenas
 * o formulário para avaliar líderes; avaliações entre colegas e
 * autoavaliações seguem calendário bimestral independente.
 *
 * A presença de uma avaliação histórica de equipe no ciclo nunca altera
 * nem apaga seus registros; apenas o link de nova coleta fica oculto.
 */
export const NOVEMBER_2026_END = '2026-11-30';
export function isNovember2026Cycle(cycle: Pick<Cycle, 'startDate' | 'endDate'> | undefined): boolean {
  return !!cycle && cycle.startDate <= NOVEMBER_2026_END && cycle.endDate >= '2026-11-01';
}
export function canShareForNovember2026(kind: EvaluationKind): boolean {
  return kind === 'leadership' || kind === 'leader_to_employee';
}
export function november2026FormStatus(cycle: Pick<Cycle, 'startDate' | 'endDate'> | undefined, kind: EvaluationKind): 'share' | 'bimonthly' | 'normal' {
  if (!isNovember2026Cycle(cycle)) return 'normal';
  return canShareForNovember2026(kind) ? 'share' : 'bimonthly';
}
