/** Presentation only: keep formName verbatim for Google Forms matching. */
export function formatPersonName(name: string): string {
  const particles = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return name.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pt-BR').split(' ').map((word,index) =>
    index > 0 && particles.has(word) ? word : word.replace(/(^|[-'’])\p{L}/gu, letter => letter.toLocaleUpperCase('pt-BR'))
  ).join(' ');
}
