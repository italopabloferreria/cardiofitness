import { afterEach, describe, expect, it, vi } from 'vitest';
import { responseBelongsToDataset } from '../src/lib/server/local-storage';
import type { AppData } from '../src/lib/types';

const mocks = vi.hoisted(() => ({ createClient: vi.fn(), createPublicClient: vi.fn(), savePersistedResponse: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/server/supabase', () => ({
  isDemoMode: () => process.env.APP_DEMO_MODE === 'true',
  isSupabaseConfigured: () => true,
  createClient: mocks.createClient,
  createPublicClient: mocks.createPublicClient,
}));
vi.mock('../src/lib/server/local-storage', async importOriginal => {
  const actual = await importOriginal<typeof import('../src/lib/server/local-storage')>();
  return { ...actual, savePersistedResponse: mocks.savePersistedResponse };
});

import { GET } from '../src/app/api/public/form-context/route';
import { POST } from '../src/app/api/evaluations/submit/route';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('portal público de avaliações', () => {
  it('não inventa um ciclo nem expõe colaboradores quando o modo real não está habilitado', async () => {
    vi.stubEnv('APP_DEMO_MODE', 'false');
    mocks.createPublicClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not configured' } }) });

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('questionário') });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('recusa envio real sem gravar no JSON local nem tentar gravar anonimamente no Supabase', async () => {
    vi.stubEnv('APP_DEMO_MODE', 'false');
    mocks.createPublicClient.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'not configured' } }) });

    const response = await POST(new Request('http://localhost/api/evaluations/submit', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        evaluationId: '00000000-0000-4000-8000-000000000001',
        respondentId: '00000000-0000-4000-8000-000000000002',
        subjectId: '00000000-0000-4000-8000-000000000003',
        kind: 'team', scores: { q1: 4 },
        textAnswers: [{ questionId: 'observation', question: 'Observações', answer: 'Bom trabalho em equipe.' }],
      }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: expect.stringContaining('Nenhum dado foi confirmado') });
    expect(mocks.savePersistedResponse).not.toHaveBeenCalled();
    expect(mocks.createPublicClient).toHaveBeenCalledOnce();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('recusa envio sem observação em texto preenchida', async () => {
    vi.stubEnv('APP_DEMO_MODE', 'true');
    const response = await POST(new Request('http://localhost/api/evaluations/submit', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify({
        evaluationId: '00000000-0000-4000-8000-000000000001',
        respondentId: '00000000-0000-4000-8000-000000000002',
        subjectId: '00000000-0000-4000-8000-000000000003',
        kind: 'team',
        scores: { q1: 4 },
        textAnswers: [{ questionId: 'observation', question: 'Observações', answer: '   ' }],
      }),
    }));

    expect(response.status).toBe(400);
    expect(mocks.savePersistedResponse).not.toHaveBeenCalled();
    expect(mocks.createPublicClient).not.toHaveBeenCalled();
  });

  it('mantém o envio em modo demo somente no armazenamento local', async () => {
    vi.stubEnv('APP_DEMO_MODE', 'true');
    mocks.savePersistedResponse.mockResolvedValue(undefined);
    const input = {
      evaluationId: '00000000-0000-4000-8000-000000000001',
      respondentId: '00000000-0000-4000-8000-000000000002',
      subjectId: '00000000-0000-4000-8000-000000000003',
      kind: 'team',
      scores: { q1: 4 },
      textAnswers: [{ questionId: 'observation', question: 'Observações', answer: 'Excelente apoio.' }],
    };

    const response = await POST(new Request('http://localhost/api/evaluations/submit', {
      method: 'POST',
      headers: { origin: 'http://localhost', 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }));

    expect(response.status).toBe(201);
    expect(mocks.savePersistedResponse).toHaveBeenCalledOnce();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('não mistura respostas locais com IDs fora das fixtures do demo', () => {
    const data = {
      employees: [{ id: 'demo-person' }, { id: 'demo-peer' }],
      evaluations: [{ id: 'demo-evaluation' }],
    } as AppData;
    const response = {
      id: 'local-response',
      evaluationId: 'real-evaluation',
      respondentId: 'real-person',
      subjectId: 'real-peer',
    } as AppData['responses'][number];

    expect(responseBelongsToDataset(response, data)).toBe(false);
    expect(responseBelongsToDataset({ ...response, evaluationId: 'demo-evaluation', respondentId: 'demo-person', subjectId: 'demo-peer' }, data)).toBe(true);
  });
});
