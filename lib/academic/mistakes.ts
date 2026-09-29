export type MistakeCategory =
  | 'concept_error'
  | 'formula_error'
  | 'calculation_error'
  | 'careless_mistake'
  | 'interpretation_error'
  | 'time_management';

export const MISTAKE_CATEGORIES: readonly MistakeCategory[] = [
  'concept_error',
  'formula_error',
  'calculation_error',
  'careless_mistake',
  'interpretation_error',
  'time_management',
] as const;

export type MistakeStatus = 'unresolved' | 'revising' | 'mastered';

export const MISTAKE_STATUSES: readonly MistakeStatus[] = [
  'unresolved',
  'revising',
  'mastered',
] as const;

export const VALID_STATUS_TRANSITIONS: Record<MistakeStatus, readonly MistakeStatus[]> = {
  unresolved: ['revising'],
  revising: ['mastered', 'unresolved'],
  mastered: ['revising'],
};

export function isValidStatusTransition(current: MistakeStatus, next: MistakeStatus): boolean {
  if (current === next) {
    return true;
  }
  const allowed = VALID_STATUS_TRANSITIONS[current];
  return Boolean(allowed && allowed.includes(next));
}

export function isMistakeCategory(value: unknown): value is MistakeCategory {
  return typeof value === 'string' && MISTAKE_CATEGORIES.includes(value as MistakeCategory);
}

export function isMistakeStatus(value: unknown): value is MistakeStatus {
  return typeof value === 'string' && MISTAKE_STATUSES.includes(value as MistakeStatus);
}

export interface MistakeNotebookRecord {
  id: string;
  category: MistakeCategory;
  status: MistakeStatus;
  questionId?: string;
  chapterId?: string;
  topicId?: string;
  formulaId?: string;
  testId?: string;
  title?: string;
  description?: string;
  reflectionNotes?: string;
  userAttempt?: string;
  correctSolution?: string;
  subjectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateMistakeEntryInput {
  id?: string;
  category: MistakeCategory;
  status?: MistakeStatus;
  questionId?: string;
  chapterId?: string;
  topicId?: string;
  formulaId?: string;
  testId?: string;
  title?: string;
  description?: string;
  reflectionNotes?: string;
  userAttempt?: string;
  correctSolution?: string;
  subjectId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface MistakeFilter {
  category?: MistakeCategory;
  status?: MistakeStatus;
  questionId?: string;
  chapterId?: string;
  topicId?: string;
  formulaId?: string;
  testId?: string;
  subjectId?: string;
}

export interface SymbolDefinitionItem {
  symbol: string;
  definition: string;
  unit?: string;
}

export type SymbolDefinitions = Record<string, string> | SymbolDefinitionItem[];

export interface FormulaRecord {
  id: string;
  title: string;
  shortCode: string;
  mathematicalNotation: string;
  symbolDefinitions: SymbolDefinitions;
  explanations: string | string[];
  tags: string[];
  isFavorite: boolean;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateFormulaInput {
  id?: string;
  title: string;
  shortCode: string;
  mathematicalNotation: string;
  symbolDefinitions?: SymbolDefinitions;
  explanations?: string | string[];
  tags?: string[];
  isFavorite?: boolean;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface UpdateFormulaInput {
  title?: string;
  shortCode?: string;
  mathematicalNotation?: string;
  symbolDefinitions?: SymbolDefinitions;
  explanations?: string | string[];
  tags?: string[];
  isFavorite?: boolean;
  subjectId?: string;
  chapterId?: string;
  topicId?: string;
}

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${timestamp}_${randomPart}`;
}

const mistakeStore = new Map<string, MistakeNotebookRecord>();
const formulaStore = new Map<string, FormulaRecord>();

export function createMistakeEntry(data: CreateMistakeEntryInput): MistakeNotebookRecord {
  if (!isMistakeCategory(data.category)) {
    throw new Error(`Invalid mistake category: ${data.category}`);
  }

  const initialStatus: MistakeStatus = data.status ?? 'unresolved';
  if (!isMistakeStatus(initialStatus)) {
    throw new Error(`Invalid mistake status: ${data.status}`);
  }

  const now = Date.now();
  const id = data.id || generateId('mstk');

  const record: MistakeNotebookRecord = {
    id,
    category: data.category,
    status: initialStatus,
    questionId: data.questionId,
    chapterId: data.chapterId,
    topicId: data.topicId,
    formulaId: data.formulaId,
    testId: data.testId,
    title: data.title,
    description: data.description,
    reflectionNotes: data.reflectionNotes,
    userAttempt: data.userAttempt,
    correctSolution: data.correctSolution,
    subjectId: data.subjectId,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? data.createdAt ?? now,
  };

  mistakeStore.set(record.id, record);
  return record;
}

export function updateMistakeStatus(
  mistakeId: string,
  status: MistakeStatus,
  reflectionNotes?: string
): void {
  const entry = mistakeStore.get(mistakeId);
  if (!entry) {
    throw new Error(`Mistake entry not found: ${mistakeId}`);
  }

  if (!isMistakeStatus(status)) {
    throw new Error(`Invalid mistake status: ${status}`);
  }

  if (entry.status !== status && !isValidStatusTransition(entry.status, status)) {
    throw new Error(`Invalid status transition from ${entry.status} to ${status}`);
  }

  entry.status = status;
  if (reflectionNotes !== undefined) {
    entry.reflectionNotes = reflectionNotes;
  }
  entry.updatedAt = Date.now();
}

export function getMistakeAnalytics(chapterId?: string): Record<MistakeCategory, number> {
  const analytics: Record<MistakeCategory, number> = {
    concept_error: 0,
    formula_error: 0,
    calculation_error: 0,
    careless_mistake: 0,
    interpretation_error: 0,
    time_management: 0,
  };

  for (const entry of mistakeStore.values()) {
    if (chapterId && entry.chapterId !== chapterId) {
      continue;
    }
    if (entry.category in analytics) {
      analytics[entry.category] += 1;
    }
  }

  return analytics;
}

export function getMistakeById(mistakeId: string): MistakeNotebookRecord | null {
  return mistakeStore.get(mistakeId) ?? null;
}

export function getAllMistakes(filter?: MistakeFilter): MistakeNotebookRecord[] {
  let list = Array.from(mistakeStore.values());
  if (!filter) {
    return list;
  }
  if (filter.category) {
    list = list.filter((m) => m.category === filter.category);
  }
  if (filter.status) {
    list = list.filter((m) => m.status === filter.status);
  }
  if (filter.questionId) {
    list = list.filter((m) => m.questionId === filter.questionId);
  }
  if (filter.chapterId) {
    list = list.filter((m) => m.chapterId === filter.chapterId);
  }
  if (filter.topicId) {
    list = list.filter((m) => m.topicId === filter.topicId);
  }
  if (filter.formulaId) {
    list = list.filter((m) => m.formulaId === filter.formulaId);
  }
  if (filter.testId) {
    list = list.filter((m) => m.testId === filter.testId);
  }
  if (filter.subjectId) {
    list = list.filter((m) => m.subjectId === filter.subjectId);
  }
  return list;
}

export function deleteMistakeEntry(mistakeId: string): boolean {
  return mistakeStore.delete(mistakeId);
}

export function getMistakesByQuestionId(questionId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.questionId === questionId);
}

export function getMistakesByChapterId(chapterId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.chapterId === chapterId);
}

export function getMistakesByTopicId(topicId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.topicId === topicId);
}

export function getMistakesByFormulaId(formulaId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.formulaId === formulaId);
}

export function getMistakesByTestId(testId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.testId === testId);
}

export function createFormula(data: CreateFormulaInput): FormulaRecord {
  if (!data.title || typeof data.title !== 'string') {
    throw new Error('Formula title is required');
  }
  if (!data.shortCode || typeof data.shortCode !== 'string') {
    throw new Error('Formula shortCode is required');
  }
  if (!data.mathematicalNotation || typeof data.mathematicalNotation !== 'string') {
    throw new Error('Formula mathematicalNotation is required');
  }

  const now = Date.now();
  const id = data.id || generateId('frm');

  const formula: FormulaRecord = {
    id,
    title: data.title.trim(),
    shortCode: data.shortCode.trim(),
    mathematicalNotation: data.mathematicalNotation.trim(),
    symbolDefinitions: data.symbolDefinitions ?? {},
    explanations: data.explanations ?? '',
    tags: Array.isArray(data.tags) ? [...data.tags] : [],
    isFavorite: Boolean(data.isFavorite),
    subjectId: data.subjectId,
    chapterId: data.chapterId,
    topicId: data.topicId,
    createdAt: data.createdAt ?? now,
    updatedAt: data.updatedAt ?? data.createdAt ?? now,
  };

  formulaStore.set(formula.id, formula);
  return formula;
}

export function getFormulaById(formulaId: string): FormulaRecord | null {
  return formulaStore.get(formulaId) ?? null;
}

export function getAllFormulas(subjectId?: string): FormulaRecord[] {
  const all = Array.from(formulaStore.values());
  if (!subjectId) {
    return all;
  }
  return all.filter((f) => f.subjectId === subjectId);
}

export function updateFormula(formulaId: string, updates: UpdateFormulaInput): FormulaRecord {
  const formula = formulaStore.get(formulaId);
  if (!formula) {
    throw new Error(`Formula not found: ${formulaId}`);
  }

  if (updates.title !== undefined) {
    formula.title = updates.title.trim();
  }
  if (updates.shortCode !== undefined) {
    formula.shortCode = updates.shortCode.trim();
  }
  if (updates.mathematicalNotation !== undefined) {
    formula.mathematicalNotation = updates.mathematicalNotation.trim();
  }
  if (updates.symbolDefinitions !== undefined) {
    formula.symbolDefinitions = updates.symbolDefinitions;
  }
  if (updates.explanations !== undefined) {
    formula.explanations = updates.explanations;
  }
  if (updates.tags !== undefined) {
    formula.tags = Array.isArray(updates.tags) ? [...updates.tags] : [];
  }
  if (updates.isFavorite !== undefined) {
    formula.isFavorite = updates.isFavorite;
  }
  if (updates.subjectId !== undefined) {
    formula.subjectId = updates.subjectId;
  }
  if (updates.chapterId !== undefined) {
    formula.chapterId = updates.chapterId;
  }
  if (updates.topicId !== undefined) {
    formula.topicId = updates.topicId;
  }

  formula.updatedAt = Date.now();
  return formula;
}

export function deleteFormula(formulaId: string): boolean {
  return formulaStore.delete(formulaId);
}

export function lookupFormulaByShortCode(shortCode: string): FormulaRecord | null {
  if (!shortCode) {
    return null;
  }
  const normalized = shortCode.trim().toLowerCase();
  for (const formula of formulaStore.values()) {
    if (formula.shortCode.trim().toLowerCase() === normalized) {
      return formula;
    }
  }
  return null;
}

export function searchFormulas(query: string, subjectId?: string): FormulaRecord[] {
  const normalizedQuery = (query || '').trim().toLowerCase();
  const results: FormulaRecord[] = [];

  for (const formula of formulaStore.values()) {
    if (subjectId !== undefined && formula.subjectId !== subjectId) {
      continue;
    }

    if (!normalizedQuery) {
      results.push(formula);
      continue;
    }

    const titleMatch = formula.title.toLowerCase().includes(normalizedQuery);
    const notationMatch = formula.mathematicalNotation.toLowerCase().includes(normalizedQuery);
    const tagMatch =
      Array.isArray(formula.tags) &&
      formula.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
    const shortCodeMatch = formula.shortCode.toLowerCase().includes(normalizedQuery);

    let explanationMatch = false;
    if (typeof formula.explanations === 'string') {
      explanationMatch = formula.explanations.toLowerCase().includes(normalizedQuery);
    } else if (Array.isArray(formula.explanations)) {
      explanationMatch = formula.explanations.some((exp) => exp.toLowerCase().includes(normalizedQuery));
    }

    if (titleMatch || notationMatch || tagMatch || shortCodeMatch || explanationMatch) {
      results.push(formula);
    }
  }

  return results;
}

export function toggleFormulaFavorite(formulaId: string): boolean {
  const formula = formulaStore.get(formulaId) ?? lookupFormulaByShortCode(formulaId);
  if (!formula) {
    throw new Error(`Formula not found: ${formulaId}`);
  }
  formula.isFavorite = !formula.isFavorite;
  formula.updatedAt = Date.now();
  return formula.isFavorite;
}

export function getFormulaForMistake(mistakeId: string): FormulaRecord | null {
  const mistake = mistakeStore.get(mistakeId);
  if (!mistake || !mistake.formulaId) {
    return null;
  }
  return formulaStore.get(mistake.formulaId) ?? lookupFormulaByShortCode(mistake.formulaId);
}

export function getMistakesForFormula(formulaId: string): MistakeNotebookRecord[] {
  return Array.from(mistakeStore.values()).filter((m) => m.formulaId === formulaId);
}

export function clearMistakeStore(): void {
  mistakeStore.clear();
}

export function clearFormulaStore(): void {
  formulaStore.clear();
}

export function resetAcademicStores(): void {
  mistakeStore.clear();
  formulaStore.clear();
}
