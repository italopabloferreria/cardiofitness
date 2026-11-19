import { describe, expect, it } from 'vitest';
import { NativeEvaluationPreview } from '../src/components/native-prototype';
import NativeEvaluationPage from '../src/app/preview/avaliar/page';

describe('rota de prévia de avaliações nativas', () => {
  it('renderiza o protótipo fictício em vez do formulário público legado', () => {
    const page = NativeEvaluationPage();

    expect(page.type).toBe(NativeEvaluationPreview);
    expect(page.props).toEqual({});
  });
});
