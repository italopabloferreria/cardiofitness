import { describe, expect, it } from 'vitest';
import { canShareForNovember2026, isNovember2026Cycle, november2026FormStatus } from '../src/lib/november-campaign';

describe('campanha novembro 2026', () => {
  const november = { startDate: '2026-11-01', endDate: '2026-11-30' };
  it('reconhece novembro inclusive quando o ciclo for bimestral', () => {
    expect(isNovember2026Cycle(november)).toBe(true);
    expect(isNovember2026Cycle({startDate:'2026-11-01',endDate:'2026-12-31'})).toBe(true);
    expect(isNovember2026Cycle({startDate:'2026-09-01',endDate:'2026-10-31'})).toBe(false);
    expect(isNovember2026Cycle({startDate:'2026-12-01',endDate:'2026-12-31'})).toBe(false);
  });
  it('não compartilha o formulário entre colegas ou autoavaliação em novembro', () => {
    expect(canShareForNovember2026('leadership')).toBe(true);
    expect(canShareForNovember2026('leader_to_employee')).toBe(true);
    expect(november2026FormStatus(november,'team')).toBe('bimonthly');
    expect(november2026FormStatus(november,'self')).toBe('bimonthly');
    expect(november2026FormStatus(november,'leadership')).toBe('share');
    expect(november2026FormStatus({startDate:'2026-12-01',endDate:'2026-12-31'},'team')).toBe('normal');
  });
});
