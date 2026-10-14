/** Presentation only: keep formName verbatim for Google Forms matching. */
export function formatPersonName(name: string): string {
  return name.trim().replace(/\s+/gu, ' ').toLocaleUpperCase('pt-BR');
}
