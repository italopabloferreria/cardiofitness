import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ExcelJS from 'exceljs';
import { PDFArray, PDFDocument, PDFName, PDFRawStream, StandardFonts, decodePDFRawStream } from 'pdf-lib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { downloadReport } from '../src/lib/export';
import type { AppData, Employee, Evaluation, EvaluationResponse } from '../src/lib/types';

const currentCycle = 'cycle-current';
const teamForm = 'form-team';
const ana = 'employee-ana';
const rafael = 'employee-rafael';
type Download = { blob: Blob; name: string; clicked: boolean; removed: boolean };
let downloads: Download[];

function employee(id: string, name: string, isLeader = false): Employee {
  return { id, name, email: `${id}@example.com`, formName: name, department: 'Recepção', leaderId: isLeader ? null : rafael, isLeader, active: true };
}

function evaluation(id: string, cycleId: string, name: string, kind: Evaluation['kind']): Evaluation {
  return {
    id, cycleId, name, kind, googleFormId: `google-${id}`, googleFormUrl: 'https://docs.google.com/forms/d/example/viewform',
    expectedResponses: 4, lastSyncedAt: null, syncMessage: null,
    mapping: { respondentQuestionIds: ['respondent'], subjectQuestionIds: ['subject'], departmentQuestionIds: [], scoreQuestions: [
      { id: 'communication', title: 'Comunicação e colaboração', min: 1, max: 4 },
      { id: 'organization', title: 'Organização do trabalho', min: 1, max: 4 },
    ] },
  };
}

function response(id: string, evaluationId: string, subjectId: string, respondentId: string, kind: EvaluationResponse['kind'], day: number, scores: [number, number]): EvaluationResponse {
  return { id, evaluationId, subjectId, respondentId, kind, googleResponseId: `google-${id}`, submittedAt: `2026-10-${String(day).padStart(2, '0')}T13:00:00Z`, scores: { communication: scores[0], organization: scores[1] } };
}

function fixture(): AppData {
  return {
    employees: [employee(ana, 'Ana Costa'), employee('employee-bruno', 'Bruno Silva'), employee(rafael, 'Rafael Nunes', true)],
    cycles: [
      { id: currentCycle, name: 'Set - Out / 2026', startDate: '2026-09-01', endDate: '2026-10-31', participants: [{ employeeId: ana, leaderId: rafael }, { employeeId: 'employee-bruno', leaderId: rafael }] },
      { id: 'cycle-old', name: 'Jul - Ago / 2026', startDate: '2026-07-01', endDate: '2026-08-31', participants: [{ employeeId: ana, leaderId: rafael }] },
    ],
    evaluations: [evaluation(teamForm, currentCycle, 'Avaliação e autoavaliação da equipe', 'team'), evaluation('form-leaders', currentCycle, 'Avaliação de líderes', 'leadership'), evaluation('form-old', 'cycle-old', 'Formulário de outro ciclo', 'team')],
    responses: [
      response('response-team-ana', teamForm, ana, rafael, 'team', 6, [2, 3]),
      response('response-self-ana', teamForm, ana, ana, 'self', 5, [2, 4]),
      response('response-team-bruno', teamForm, 'employee-bruno', ana, 'team', 4, [4, 4]),
      response('response-leader', 'form-leaders', rafael, ana, 'leadership', 3, [3, 4]),
      { ...response('response-old', 'form-old', ana, rafael, 'team', 2, [1, 1]), submittedAt: '2026-08-02T13:00:00Z' },
    ],
  };
}

beforeEach(() => {
  downloads = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => {
    expect(blob).toBeInstanceOf(Blob);
    downloads.push({ blob: blob as Blob, name: '', clicked: false, removed: false });
    return `blob:export-${downloads.length}`;
  });
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.stubGlobal('document', {
    createElement: (tag: string) => {
      expect(tag).toBe('a');
      return { href: '', download: '', click() { downloads.at(-1)!.name = this.download; downloads.at(-1)!.clicked = true; }, remove() { downloads.at(-1)!.removed = true; } };
    },
    body: { appendChild: vi.fn() },
  });
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function savedBytes(extension: 'pdf' | 'xlsx') {
  expect(downloads).toHaveLength(1);
  expect(downloads[0]).toMatchObject({ name: `Cardiofitness_2026-09-01_individual.${extension}`, clicked: true, removed: true });
  expect(document.body.appendChild).toHaveBeenCalledTimes(1);
  expect(downloads[0].blob.type).toBe(extension === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return new Uint8Array(await downloads[0].blob.arrayBuffer());
}

type TextRun = { text: string; x: number; y: number; size: number; bold: boolean };
function pageTextRuns(pdf: PDFDocument, index: number): TextRun[] {
  const contents = pdf.getPage(index).node.get(PDFName.of('Contents'));
  const references = contents instanceof PDFArray ? contents.asArray() : [contents];
  const streams = references.map(reference => {
    const stream = pdf.context.lookup(reference);
    expect(stream).toBeInstanceOf(PDFRawStream);
    return new TextDecoder().decode(decodePDFRawStream(stream as PDFRawStream).decode());
  }).join('\n');
  return [...streams.matchAll(/BT\s([\s\S]*?)\sET/g)].map(([, operators]) => {
    const [, font, size] = operators.match(/\/([^\s]+)\s+([\d.]+)\s+Tf/) ?? [];
    const [, x, y] = operators.match(/1\s+0\s+0\s+1\s+(-?[\d.]+)\s+(-?[\d.]+)\s+Tm/) ?? [];
    const [, hex] = operators.match(/<([0-9A-Fa-f]+)>\s*Tj/) ?? [];
    expect(hex, `Texto PDF decodificável: ${operators}`).toBeTruthy();
    return { text: new TextDecoder('windows-1252').decode(Buffer.from(hex!, 'hex')), x: Number(x), y: Number(y), size: Number(size), bold: font?.includes('Bold') ?? false };
  });
}

async function assertReadablePdf(pdf: PDFDocument) {
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let index = 0; index < pdf.getPageCount(); index++) {
    const runs = pageTextRuns(pdf, index);
    const { width, height } = pdf.getPage(index).getSize();
    expect(runs.map(run => run.text)).toContain(`${index + 1} / ${pdf.getPageCount()}`);
    expect(runs.map(run => run.text)).toEqual(expect.arrayContaining(['Cardiofitness', 'PESSOA AVALIADA', 'RESPONDENTE', 'TIPO', 'FORMULÁRIO', 'MÉDIA']));
    for (const run of runs) {
      expect(run.x, `Margem esquerda: ${run.text}`).toBeGreaterThanOrEqual(0);
      expect(run.y, `Margem inferior: ${run.text}`).toBeGreaterThanOrEqual(0);
      expect(run.y + run.size, `Margem superior: ${run.text}`).toBeLessThanOrEqual(height);
      expect(run.x + (run.bold ? bold : regular).widthOfTextAtSize(run.text, run.size), `Texto cortado à direita: ${run.text}`).toBeLessThanOrEqual(width);
    }
  }
}

async function sample(name: string, bytes: Uint8Array) {
  if (!process.env.EXPORT_QA_DIR) return;
  await mkdir(process.env.EXPORT_QA_DIR, { recursive: true });
  await writeFile(join(process.env.EXPORT_QA_DIR, name), bytes);
}

describe('arquivos reais dos relatórios', () => {
  const filters = { cycleId: currentCycle, evaluationId: teamForm, employeeId: ana };

  it('exporta XLSX com os filtros combinados, identidades e notas numéricas da escala original', async () => {
    await downloadReport(fixture(), filters, 'xlsx', true);
    const bytes = await savedBytes('xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    expect(workbook.creator).toBe('Cardiofitness');
    expect(workbook.worksheets.map(sheet => sheet.name)).toEqual(['Resumo', 'Respostas', 'Notas por pergunta', 'Respostas de texto']);
    const summary = new Map(workbook.getWorksheet('Resumo')!.getSheetValues().slice(2).map(row => { const cells = row as ExcelJS.CellValue[]; return [cells[1], cells[2]]; }));
    expect(summary.get('Respostas no relatório')).toBe(2);
    expect(summary.get('Pessoa avaliada')).toBe('Ana Costa');
    expect(summary.get('Formulário')).toBe('Avaliação e autoavaliação da equipe');
    expect(summary.get('Período')).toBe('01/09/2026 a 31/10/2026');
    expect(summary.get('Origem')).toBe('Demonstração com dados fictícios');
    const sheet = workbook.getWorksheet('Respostas')!;
    expect(sheet.rowCount).toBe(3);
    expect(sheet.getColumn(4).values.slice(2)).toEqual(['Ana Costa', 'Ana Costa']);
    expect(sheet.getColumn(5).values.slice(2)).toEqual(['Rafael Nunes', 'Ana Costa']);
    expect(sheet.getColumn(3).values.slice(2)).toEqual(['Avaliação da equipe', 'Autoavaliação']);
    expect(sheet.getColumn(7).values.slice(2)).toEqual(['06/10/2026', '05/10/2026']);
    expect(sheet.getColumn(8).values.slice(2)).toEqual([2.5, 3]);
    expect(sheet.getColumn(9).values.slice(2)).toEqual(['1 a 4', '1 a 4']);
    expect(sheet.getCell('H2').type).toBe(ExcelJS.ValueType.Number);
    expect(sheet.getCell('H2').numFmt).toBe('0.00');
    const detail = workbook.getWorksheet('Notas por pergunta')!;
    expect(detail.rowCount).toBe(5);
    expect(detail.getColumn(7).values.slice(2)).toEqual([2, 3, 2, 4]);
    expect(detail.getColumn(8).values.slice(2)).toEqual([1, 1, 1, 1]);
    expect(detail.getColumn(9).values.slice(2)).toEqual([4, 4, 4, 4]);
    await sample('relatorio-individual.xlsx', bytes);
  });

  it('preserva rótulos semelhantes a fórmulas como texto literal, sem fórmulas ou hyperlinks executáveis', async () => {
    const data = fixture();
    data.cycles[0].name = '=SUM(1,2)';
    data.evaluations[0].name = '@SUM(1,2)';
    data.employees[0].name = '=HYPERLINK("https://example.com","Ana")';
    data.employees[0].department = '-1+1';
    data.employees[2].name = '+SUM(1,2)';
    data.evaluations[0].mapping.scoreQuestions[0].title = '=1+1';
    await downloadReport(data, filters, 'xlsx', true);
    const bytes = await savedBytes('xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes.buffer as ArrayBuffer);
    const sheet = workbook.getWorksheet('Respostas')!;
    expect(sheet.getCell('A2').value).toBe('=SUM(1,2)');
    expect(sheet.getCell('B2').value).toBe('@SUM(1,2)');
    expect(sheet.getCell('D2').value).toBe('=HYPERLINK("https://example.com","Ana")');
    expect(sheet.getCell('E2').value).toBe('+SUM(1,2)');
    expect(sheet.getCell('F2').value).toBe('-1+1');
    expect(workbook.getWorksheet('Notas por pergunta')!.getCell('F2').value).toBe('=1+1');
    workbook.eachSheet(worksheet => worksheet.eachRow(row => row.eachCell(cell => {
      expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
      expect(cell.type).not.toBe(ExcelJS.ValueType.Hyperlink);
    })));
  });

  it('gera PDF filtrado com identidades, datas e médias corretas sem dados de outro ciclo ou pessoa', async () => {
    await downloadReport(fixture(), filters, 'pdf', true);
    const bytes = await savedBytes('pdf');
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getTitle()).toBe('Cardiofitness - Relatório de avaliações');
    expect(pdf.getAuthor()).toBe('Cardiofitness');
    expect(pdf.getPageCount()).toBe(1);
    const text = pageTextRuns(pdf, 0).map(run => run.text);
    expect(text).toEqual(expect.arrayContaining(['Ana Costa', 'Rafael Nunes', 'Pessoa: Ana Costa', 'Avaliação da equipe', 'Autoavaliação', '2,50', '3,00', 'Resposta em 06/10/2026', 'Resposta em 05/10/2026']));
    expect(text.some(value => value.includes('2 respostas identificadas'))).toBe(true);
    expect(text.some(value => value.includes('DADOS FICTÍCIOS'))).toBe(true);
    expect(text.join('\n')).not.toMatch(/Bruno Silva|Jul - Ago|Formulário de outro ciclo|Avaliação de líderes/);
    await assertReadablePdf(pdf);
    await sample('relatorio-individual.pdf', bytes);
  });

  it('pagina nomes compostos sem perder respostas, repetir linhas ou ultrapassar as margens', async () => {
    const data = fixture();
    data.responses = [];
    const names = Array.from({ length: 36 }, (_, index) => `Pessoa ${String(index + 1).padStart(2, '0')} de Nome Composto para Conferência de Quebras e Continuação entre Páginas`);
    names.forEach((name, index) => {
      const id = `pagination-person-${index}`;
      data.employees.push(employee(id, name));
      data.responses.push(response(`pagination-response-${index}`, teamForm, id, rafael, 'team', 6, [2, 4]));
    });
    await downloadReport(data, { cycleId: currentCycle, evaluationId: teamForm }, 'pdf', true);
    expect(downloads[0].name).toBe('Cardiofitness_2026-09-01_avaliacoes.pdf');
    const bytes = new Uint8Array(await downloads[0].blob.arrayBuffer());
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThan(1);
    const runs = pdf.getPages().flatMap((_, index) => pageTextRuns(pdf, index));
    names.forEach((_, index) => expect(runs.filter(run => run.text.startsWith(`Pessoa ${String(index + 1).padStart(2, '0')} `))).toHaveLength(1));
    expect(runs.filter(run => run.text === 'Resposta em 06/10/2026')).toHaveLength(36);
    await assertReadablePdf(pdf);
    await sample('relatorio-paginado.pdf', bytes);
  });

  it('mantém cabeçalhos legíveis para nomes dentro dos limites aceitos pelo cadastro', async () => {
    const data = fixture();
    data.cycles[0].name = 'W'.repeat(100);
    data.evaluations[0].name = 'W'.repeat(140);
    data.employees[0].name = 'W'.repeat(140);
    await downloadReport(data, filters, 'pdf', true);
    const bytes = await savedBytes('pdf');
    await sample('relatorio-nomes-longos.pdf', bytes);
    await assertReadablePdf(await PDFDocument.load(bytes));
  });

  it('mantém a origem de produção quando o modo demonstrativo não é solicitado', async () => {
    await downloadReport(fixture(), filters, 'xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load((await savedBytes('xlsx')).buffer as ArrayBuffer);
    expect(workbook.getWorksheet('Resumo')!.getCell('B8').value).toBe('Respostas identificadas do Google Forms');
    downloads = [];
    vi.mocked(document.body.appendChild).mockClear();
    await downloadReport(fixture(), filters, 'pdf');
    const pdf = await PDFDocument.load(await savedBytes('pdf'));
    expect(pageTextRuns(pdf, 0).some(run => run.text.includes('DADOS FICTÍCIOS'))).toBe(false);
  });

  it.each(['pdf', 'xlsx'] as const)('recusa exportação %s sem ciclo válido ou sem respostas filtradas', async format => {
    await expect(downloadReport(fixture(), { cycleId: 'missing' }, format)).rejects.toThrow('Selecione um ciclo');
    await expect(downloadReport(fixture(), { cycleId: currentCycle, employeeId: 'missing' }, format)).rejects.toThrow('Não há respostas');
    expect(downloads).toHaveLength(0);
  });
});
