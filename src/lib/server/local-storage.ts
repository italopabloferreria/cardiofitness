import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { AppData, EvaluationResponse, Cycle, Employee } from '@/lib/types';

interface StorageData {
  responses: EvaluationResponse[];
  cycles?: Cycle[];
  employees?: Employee[];
}

const STORAGE_DIR = path.join(process.cwd(), 'data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'cardiofitness-storage.json');

function ensureStorage(): StorageData {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORAGE_FILE)) {
      const initial: StorageData = { responses: [] };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const parsed = JSON.parse(content) as StorageData;
    if (!Array.isArray(parsed.responses)) {
      parsed.responses = [];
    }
    return parsed;
  } catch {
    return { responses: [] };
  }
}

function writeStorage(data: StorageData): void {
  try {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Falha ao gravar armazenamento local:', err);
  }
}

export async function getPersistedResponses(): Promise<EvaluationResponse[]> {
  const store = ensureStorage();
  return store.responses;
}

export async function savePersistedResponse(response: EvaluationResponse): Promise<void> {
  const store = ensureStorage();
  const existingIndex = store.responses.findIndex(
    r =>
      r.evaluationId === response.evaluationId &&
      r.respondentId === response.respondentId &&
      r.subjectId === response.subjectId
  );

  if (existingIndex >= 0) {
    store.responses[existingIndex] = response;
  } else {
    store.responses.push(response);
  }

  writeStorage(store);
}

export async function mergeWithPersistedData(baseData: AppData): Promise<AppData> {
  const store = ensureStorage();
  if (!store.responses.length && !store.cycles?.length && !store.employees?.length) {
    return baseData;
  }

  const responseMap = new Map<string, EvaluationResponse>();
  for (const r of baseData.responses) {
    responseMap.set(`${r.evaluationId}:${r.respondentId}:${r.subjectId}`, r);
  }
  for (const r of store.responses) {
    responseMap.set(`${r.evaluationId}:${r.respondentId}:${r.subjectId}`, r);
  }

  let cycles = baseData.cycles;
  if (store.cycles?.length) {
    const cycleMap = new Map<string, Cycle>(baseData.cycles.map(c => [c.id, c]));
    for (const c of store.cycles) {
      cycleMap.set(c.id, c);
    }
    cycles = Array.from(cycleMap.values());
  }

  let employees = baseData.employees;
  if (store.employees?.length) {
    const empMap = new Map<string, Employee>(baseData.employees.map(e => [e.id, e]));
    for (const e of store.employees) {
      empMap.set(e.id, e);
    }
    employees = Array.from(empMap.values());
  }

  return {
    ...baseData,
    employees,
    cycles,
    responses: Array.from(responseMap.values()),
  };
}
