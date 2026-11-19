import { describe, expect, it } from 'vitest';
import { createDemoData } from '../src/lib/demo';
import { ALL_OFFICIAL_EMPLOYEES } from '../src/lib/roster-data';
import { PROVIDED_FORMS } from '../src/lib/form-presets';

describe('isolamento da demonstração', () => {
  it('usa somente pessoas, IDs, links e respostas fictícios', () => {
    const demo = createDemoData();
    const officialIds = new Set(ALL_OFFICIAL_EMPLOYEES.map(person => person.id));
    const officialNames = new Set(ALL_OFFICIAL_EMPLOYEES.map(person => person.name));
    const officialFormIds = new Set(PROVIDED_FORMS.map(form => form.googleFormId));

    expect(demo.employees.length).toBeGreaterThan(0);
    expect(demo.employees.every(person => !officialIds.has(person.id))).toBe(true);
    expect(demo.employees.every(person => !officialNames.has(person.name))).toBe(true);
    expect(demo.employees.every(person => person.email.endsWith('@example.invalid'))).toBe(true);
    expect(demo.cycles.every(cycle => cycle.name.includes('DEMO FICTÍCIA'))).toBe(true);
    expect(demo.evaluations.every(evaluation => !officialFormIds.has(evaluation.googleFormId))).toBe(true);
    expect(demo.evaluations.every(evaluation => evaluation.sourceType === 'native' && evaluation.googleFormId === '' && evaluation.googleFormUrl === '')).toBe(true);
    expect(demo.responses.every(response => response.googleResponseId.startsWith('demo-only-'))).toBe(true);
  });
});
