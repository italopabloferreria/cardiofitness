import {afterEach, describe, expect, it, vi} from 'vitest';
import {defaultCycle} from '../src/lib/analytics';
import type {Cycle} from '../src/lib/types';

const cycle = (id: string, startDate: string, endDate: string): Cycle => ({id, name: id, startDate, endDate, participants: []});
afterEach(() => vi.useRealTimers());
describe('ciclo exibido ao abrir o painel', () => {
  it('abre outubro em andamento mesmo com novembro programado', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-09T14:00:00Z'));
    const october = cycle('outubro', '2026-10-08', '2026-10-20');
    expect(defaultCycle([cycle('novembro', '2026-11-01', '2026-12-31'), october])?.id).toBe('outubro');
  });
  it('mantém o ciclo ativo até o fim do dia em São Paulo', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-21T02:59:59Z'));
    expect(defaultCycle([cycle('futuro', '2026-11-01', '2026-12-31'), cycle('atual', '2026-10-08', '2026-10-20')])?.id).toBe('atual');
  });
  it('sem coleta ativa, abre o último encerrado ou o próximo programado', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-10-09T14:00:00Z'));
    const past = cycle('anterior', '2026-08-01', '2026-09-30');
    const next = cycle('proximo', '2026-11-01', '2026-12-31');
    const later = cycle('depois', '2027-01-01', '2027-02-28');
    expect(defaultCycle([later, past, next])?.id).toBe('anterior');
    expect(defaultCycle([later, next])?.id).toBe('proximo');
    expect(defaultCycle([])).toBeUndefined();
  });
});
