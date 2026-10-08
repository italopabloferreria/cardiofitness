import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getAccessToken: vi.fn(), setCredentials: vi.fn(), oauth: vi.fn(), jwt: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('google-auth-library', () => {
  class OAuth2Client {
    constructor(options: unknown) { mocks.oauth(options); }
    setCredentials = mocks.setCredentials;
    getAccessToken = mocks.getAccessToken;
  }
  class JWT extends OAuth2Client {
    constructor(options: unknown) { super(options); mocks.jwt(options); }
  }
  return { OAuth2Client, JWT };
});
import { getFormMetadata, getFormResponses, isGoogleConfigured, validateGoogleFormId } from '../src/lib/google/client';

const id = 'api-editor-form-id-0123456789';
const json = (body: unknown, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GOOGLE_CLIENT_ID', 'client'); vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret'); vi.stubEnv('GOOGLE_REFRESH_TOKEN', 'refresh');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', ''); vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', '');
  mocks.getAccessToken.mockResolvedValue({ token: 'ACCESS_TOKEN_DO_NOT_PRINT' });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('cliente Forms API somente leitura', () => {
  it('rejeita IDs públicos e URLs sem fazer chamadas', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(getFormResponses('1FAIpQLSfVn_za-v4FPO_public')).rejects.toThrow('URL de edição');
    await expect(getFormMetadata('https://docs.google.com/forms/d/e/1FAIp/viewform')).rejects.toThrow('link público');
    expect(() => validateGoogleFormId('https://docs.google.com/forms/d/actual/edit')).toThrow('somente o ID');
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.getAccessToken).not.toHaveBeenCalled();
  });

  it('falha fechado sem credenciais e não divulga erros de autenticação', async () => {
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', '');
    expect(isGoogleConfigured()).toBe(false);
    await expect(getFormResponses(id)).rejects.toThrow('Conexão Google Forms pendente');
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', 'refresh');
    mocks.getAccessToken.mockRejectedValue(new Error('SECRET-LEAK'));
    await expect(getFormResponses(id)).rejects.toThrow('Não foi possível autenticar');
    await expect(getFormResponses(id)).rejects.not.toThrow('SECRET-LEAK');
  });

  it('percorre páginas até o fim sem expor ou cachear respostas', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ responses: [{ responseId: 'r1', lastSubmittedTime: '2026-10-01T12:00:00Z' }], nextPageToken: 'page+2/=' }))
      .mockResolvedValueOnce(json({ responses: [{ responseId: 'r2', lastSubmittedTime: '2026-10-02T12:00:00Z' }] }));
    vi.stubGlobal('fetch', fetch);
    expect((await getFormResponses(id)).map(item => item.responseId)).toEqual(['r1', 'r2']);
    expect(new URL(fetch.mock.calls[1][0]).searchParams.get('pageToken')).toBe('page+2/=');
    expect(fetch.mock.calls[0][1]).toMatchObject({ cache: 'no-store', redirect: 'error', headers: { Authorization: 'Bearer ACCESS_TOKEN_DO_NOT_PRINT' } });
    expect(mocks.setCredentials).toHaveBeenCalledWith({ refresh_token: 'refresh' });
    expect(mocks.getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('repete falha temporária com limite e recupera resultado', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(json({ error: 'secret' }, 503)).mockResolvedValueOnce(json({ responses: [] }));
    vi.stubGlobal('fetch', fetch);
    expect(await getFormResponses(id)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('aplica timeout a cada chamada e repete uma falha de transporte sem incluir seu erro', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('SECRET-TRANSPORT')).mockResolvedValueOnce(json({ responses: [] }));
    vi.stubGlobal('fetch', fetch);
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    expect(await getFormResponses(id)).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(timeout).toHaveBeenCalledWith(8000);
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    timeout.mockRestore();
  });

  it('encerra uma sincronização ao ultrapassar o prazo total', async () => {
    const started = Date.now();
    const now = vi.spyOn(Date, 'now').mockReturnValue(started);
    const fetch = vi.fn().mockImplementation(() => {
      now.mockReturnValue(started + 46_000);
      return Promise.resolve(json({ responses: [], nextPageToken: 'more' }));
    });
    vi.stubGlobal('fetch', fetch);
    try {
      await expect(getFormResponses(id)).rejects.toThrow('demorou para responder');
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally { now.mockRestore(); }
  });

  it('limita tentativas, não repete falta de acesso e omite corpo do erro', async () => {
    const fetch = vi.fn().mockResolvedValue(json({ error: 'SECRET-LEAK' }, 503));
    vi.stubGlobal('fetch', fetch);
    await expect(getFormResponses(id)).rejects.toThrow('HTTP 503');
    expect(fetch).toHaveBeenCalledTimes(3);
    fetch.mockClear().mockResolvedValue(json({ error: 'SECRET-LEAK' }, 403));
    await expect(getFormResponses(id)).rejects.toThrow('não tem acesso');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('detecta paginação cíclica e lista malformada em vez de retornar resultado parcial', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(json({ responses: [], nextPageToken: 'repeat' })));
    vi.stubGlobal('fetch', fetch);
    await expect(getFormResponses(id)).rejects.toThrow('paginação inválida');
    expect(fetch).toHaveBeenCalledTimes(2);
    fetch.mockResolvedValue(json({ responses: 'invalid' }));
    await expect(getFormResponses(id)).rejects.toThrow('lista de respostas inválida');
  });

  it('usa conta de serviço com dois escopos de leitura e normaliza quebras da chave', async () => {
    vi.stubEnv('GOOGLE_REFRESH_TOKEN', ''); vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL', 'service@example.com'); vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY', 'line1\\nline2');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ responses: [] })));
    expect(isGoogleConfigured()).toBe(true);
    await getFormResponses(id);
    expect(mocks.jwt).toHaveBeenCalledWith(expect.objectContaining({ email: 'service@example.com', key: 'line1\nline2', scopes: [
      'https://www.googleapis.com/auth/forms.body.readonly', 'https://www.googleapis.com/auth/forms.responses.readonly',
    ] }));
    expect(mocks.setCredentials).not.toHaveBeenCalled();
  });

  it('achata grupos e seções; aceita escala, rating e escolhas numéricas contínuas', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ formId: id, info: { title: 'Equipe' }, responderUri: 'https://docs.google.com/forms/d/e/public/viewform', settings: { emailCollectionType: 'VERIFIED' }, items: [
      { title: 'Recepção', pageBreakItem: {} },
      { title: 'Seu nome', questionItem: { question: { questionId: 'name', textQuestion: {} } } },
      { title: 'Equipe', questionItem: { question: { questionId: 'score', scaleQuestion: { low: 1, high: 4 } } } },
      { title: 'Organização', questionGroupItem: { questions: [{ questionId: 'row', rowQuestion: { title: 'Cumpre acordos' } }], grid: { columns: { type: 'RADIO', options: [{ value: '1' }, { value: '2' }, { value: '3' }, { value: '4' }] } } } },
      { title: 'Musculação', pageBreakItem: {} },
      { title: 'Qualidade', questionItem: { question: { questionId: 'rating', ratingQuestion: { ratingScaleLevel: 4 } } } },
      { title: 'Escolha com lacuna', questionItem: { question: { questionId: 'gap', choiceQuestion: { type: 'RADIO', options: [{ value: '1' }, { value: '4' }] } } } },
      { title: 'Marque várias', questionItem: { question: { questionId: 'checkbox', choiceQuestion: { type: 'CHECKBOX', options: [{ value: '1' }, { value: '2' }] } } } },
    ] })));
    const metadata = await getFormMetadata(id);
    expect(metadata.collectsEmail).toBe(true);
    expect(metadata.questions.find(item => item.id === 'row')).toMatchObject({ title: 'Organização · Cumpre acordos', section: 'Recepção', min: 1, max: 4, numeric: true });
    expect(metadata.questions.filter(item => item.numeric).map(item => item.id)).toEqual(['score', 'row', 'rating']);
    expect(metadata.questions.find(item => item.id === 'rating')?.section).toBe('Musculação');
  });
});
