import { describe, expect, it } from 'vitest';
import { resolveFormId, resolveFormLink } from '../src/lib/form-link';
import { PROVIDED_FORMS } from '../src/lib/form-presets';

describe('links dos formulários por ciclo', () => {
  it('reconhece os dois formulários conferidos, incluindo parâmetros de compartilhamento', () => {
    for (const form of PROVIDED_FORMS) {
      expect(resolveFormLink(`${form.url}?usp=header`)).toEqual({url:form.url,googleFormId:form.googleFormId,preset:form});
      expect(resolveFormLink(`https://docs.google.com/forms/d/${form.googleFormId}/edit?usp=sharing`).preset).toBe(form);
    }
    expect(PROVIDED_FORMS[0].googleFormId).not.toBe(PROVIDED_FORMS[1].googleFormId);
  });
  it('não converte o código público desconhecido em ID da API', () => {
    const result=resolveFormLink('https://docs.google.com/forms/d/e/1FAIpQLOutroFormulario/viewform?usp=header');
    expect(result.googleFormId).toBe('');
    expect(result.preset).toBeUndefined();
    expect(() => resolveFormId(result.url)).toThrow('link de edição');
  });
  it('aceita o ID ou um link de edição de outro formulário', () => {
    const id='1OutroFormularioId123456789';
    expect(resolveFormId(id)).toBe(id);
    expect(resolveFormId(`https://docs.google.com/forms/u/1/d/${id}/edit`)).toBe(id);
    expect(resolveFormLink(`https://docs.google.com/forms/d/${id}/edit`).url).toBe(`https://docs.google.com/forms/d/${id}/viewform`);
  });
  it('rejeita IDs curtos em vez de permitir uma configuração inválida', () => {
    expect(() => resolveFormId('1234567890123456789')).toThrow();
  });
  it('rejeita links de outros hosts, caminhos e links encurtados', () => {
    for (const value of ['https://docs.google.com.evil.test/forms/d/a/edit','http://docs.google.com/forms/d/a/edit','https://forms.gle/abc','https://docs.google.com/forms/d/e/a/edit','https://docs.google.com/document/d/a/edit','https://user:pass@docs.google.com/forms/d/a/edit']) {
      expect(() => resolveFormLink(value)).toThrow();
    }
  });
});
