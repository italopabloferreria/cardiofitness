import { OAuth2Client, CodeChallengeMethod } from 'google-auth-library';
import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, rename, lstat, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const envPath = fileURLToPath(new URL('../.env.local', import.meta.url));
const allowFormEditing = process.argv.includes('--allow-form-editing');
const scopes = [allowFormEditing ? 'https://www.googleapis.com/auth/forms.body' : 'https://www.googleapis.com/auth/forms.body.readonly', 'https://www.googleapis.com/auth/forms.responses.readonly'];

async function saveRefreshToken(token) {
  let contents = '';
  try {
    const stat = await lstat(envPath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Arquivo de ambiente inválido.');
    contents = await readFile(envPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const line = `GOOGLE_REFRESH_TOKEN=${JSON.stringify(token)}`;
  contents = /^\s*(?:export\s+)?GOOGLE_REFRESH_TOKEN\s*=/m.test(contents)
    ? contents.replace(/^\s*(?:export\s+)?GOOGLE_REFRESH_TOKEN\s*=.*$/m, () => line)
    : `${contents.replace(/\s*$/, '')}\n${line}\n`;
  const temporary = `${envPath}.google-${randomBytes(8).toString('hex')}`;
  try {
    await writeFile(temporary, contents, { flag: 'wx', mode: 0o600 });
    await rename(temporary, envPath);
  } finally { await unlink(temporary).catch(() => {}); }
}

function launchBrowser(url) {
  if (process.env.GOOGLE_OAUTH_URL_FILE) {
    return writeFile(process.env.GOOGLE_OAUTH_URL_FILE, url, { mode: 0o600 });
  }
  const command = process.platform === 'win32' ? 'powershell.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', `Start-Process -FilePath '${url.replaceAll("'", "''")}'`]
    : [url];
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'ignore', windowsHide: true });
    child.once('error', reject);
    child.once('exit', code => code === 0 ? resolve() : reject(new Error('Falha ao abrir o navegador.')));
  });
}

async function main() {
  try { process.loadEnvFile(envPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) throw new Error('Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET em .env.local antes de autorizar.');
  const port = Number(process.env.GOOGLE_OAUTH_PORT || '42813');
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('GOOGLE_OAUTH_PORT inválida.');
  const redirectUri = `http://127.0.0.1:${port}/oauth2callback`;
  const client = new OAuth2Client({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri, transporterOptions: { timeout: 10_000, retryConfig: { retry: 1 } } });
  const verifier = await client.generateCodeVerifierAsync();
  const state = randomBytes(32).toString('base64url');
  let finish;
  let fail;
  const receivedCode = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  receivedCode.catch(() => {});
  const server = createServer((request, response) => {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    const url = new URL(request.url || '/', redirectUri);
    if (request.method !== 'GET' || request.headers.host !== `127.0.0.1:${port}` || request.socket.remoteAddress !== '127.0.0.1' || url.pathname !== '/oauth2callback') {
      response.writeHead(404); response.end('Página não encontrada.'); return;
    }
    const actualState = Buffer.from(url.searchParams.get('state') || '');
    const expectedState = Buffer.from(state);
    if (actualState.length !== expectedState.length || !timingSafeEqual(actualState, expectedState)) {
      response.writeHead(400); response.end('Autorização inválida.'); return;
    }
    const code = url.searchParams.get('code');
    if (url.searchParams.has('error') || !code) {
      response.writeHead(400); response.end('Autorização não concluída.'); fail(new Error('Autorização não concluída.')); return;
    }
    response.end('Autorização recebida. Volte ao terminal para conferir a conclusão.');
    finish(code);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const timeout = setTimeout(() => fail(new Error('O prazo de autorização expirou. Execute o comando novamente.')), 5 * 60 * 1000);
  try {
    console.log(`Autorização local iniciada. O OAuth deve permitir o retorno para ${redirectUri}.`);
    const authUrl = client.generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: scopes, state,
      code_challenge_method: CodeChallengeMethod.S256, code_challenge: verifier.codeChallenge });
    await launchBrowser(authUrl);
    const code = await receivedCode;
    const { tokens } = await client.getToken({ code, codeVerifier: verifier.codeVerifier, redirect_uri: redirectUri });
    if (!tokens.refresh_token) throw new Error('O Google não forneceu autorização persistente. Revogue a autorização anterior e execute novamente.');
    await saveRefreshToken(tokens.refresh_token);
    console.log('Conexão autorizada. Token salvo exclusivamente em .env.local. Reinicie o sistema.');
  } finally { clearTimeout(timeout); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}

main().catch(error => {
  // Google auth errors contain request bodies; never print those or their stack.
  const oauthError = error?.response?.data?.error;
  if (['invalid_client', 'invalid_grant', 'redirect_uri_mismatch', 'access_denied', 'unauthorized_client'].includes(oauthError)) {
    console.error(`Falha OAuth: ${oauthError}. Nenhuma credencial foi exibida.`);
    process.exitCode = 1;
    return;
  }
  const safe = error instanceof Error && /^(Configure |GOOGLE_OAUTH_PORT|Arquivo de ambiente|Autorização não concluída|O prazo de autorização|O Google não forneceu|Falha ao abrir)/.test(error.message);
  console.error(safe ? error.message : 'Falha na autorização. Confira o cliente OAuth, a URL de retorno e o acesso da conta. Nenhuma credencial foi exibida.');
  process.exitCode = 1;
});
