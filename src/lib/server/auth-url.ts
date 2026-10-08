import 'server-only';
import { ApiError } from './http';

export function getAppOrigin() {
  try {
    const url = new URL(process.env.APP_URL || '');
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error();
    return url.origin;
  } catch {
    throw new ApiError(503, 'Configure o endereço do sistema para entrar com Google.');
  }
}
