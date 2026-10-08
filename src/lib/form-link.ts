import { PROVIDED_FORMS } from './form-presets';

export function resolveFormLink(value: string) {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new Error('Cole um link válido do Google Forms.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password || url.port) {
    throw new Error('Use o endereço https://docs.google.com/forms/ do formulário.');
  }
  const match = url.pathname.match(/^\/forms\/(?:u\/\d+\/)?d\/(e\/)?([A-Za-z0-9_-]+)\/(?:viewform|edit|previewResponse)\/?$/);
  if (!match || (match[1] && !url.pathname.endsWith('/viewform'))) throw new Error('Cole o link de preenchimento ou de edição do Google Forms. Links encurtados precisam ser abertos antes.');
  const publicId = match[1] ? match[2] : null;
  const preset = PROVIDED_FORMS.find(form => publicId ? new URL(form.url).pathname === `/forms/d/e/${publicId}/viewform` : form.googleFormId === match[2]);
  return {
    url: preset?.url || `https://docs.google.com/forms/d/${publicId ? 'e/' : ''}${match[2]}/viewform`,
    googleFormId: preset?.googleFormId || (publicId ? '' : match[2]),
    preset,
  };
}

export function resolveFormId(value: string) {
  const input = value.trim();
  if (!input) return '';
  if (/^[A-Za-z0-9_-]{20,200}$/.test(input) && !input.startsWith('1FAIp')) return input;
  const resolved = resolveFormLink(input);
  if (!resolved.googleFormId) throw new Error('Este link público não informa o ID da API. Cole o link de edição desse formulário no campo de ID.');
  return resolved.googleFormId;
}
