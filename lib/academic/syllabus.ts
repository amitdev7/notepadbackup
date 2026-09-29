export type CurriculumTier =
  | 'academic_year'
  | 'subject'
  | 'unit'
  | 'chapter'
  | 'topic'
  | 'subtopic';

export type CurriculumStatus =
  | 'not_started'
  | 'learning'
  | 'practicing'
  | 'revising'
  | 'completed'
  | 'mastered';

export type ConfidenceRating = 1 | 2 | 3 | 4 | 5;

export interface AcademicYear {
  id: string;
  name: string;
  code?: string;
  startDate?: string;
  endDate?: string;
  subjects?: Subject[];
}

export interface Subject {
  id: string;
  academicYearId?: string;
  name: string;
  code?: string;
  description?: string;
  units?: Unit[];
}

export interface Unit {
  id: string;
  subjectId: string;
  name: string;
  order?: number;
  chapters?: Chapter[];
}

export interface Chapter {
  id: string;
  unitId: string;
  subjectId?: string;
  name: string;
  order?: number;
  status: CurriculumStatus;
  confidence?: ConfidenceRating;
  estimatedMinutes?: number;
  topics?: Topic[];
}

export interface Topic {
  id: string;
  chapterId: string;
  name: string;
  order?: number;
  status?: CurriculumStatus;
  confidence?: ConfidenceRating;
  estimatedMinutes?: number;
  subtopics?: Subtopic[];
}

export interface Subtopic {
  id: string;
  topicId: string;
  name: string;
  order?: number;
  status?: CurriculumStatus;
  confidence?: ConfidenceRating;
  estimatedMinutes?: number;
}

export interface SubjectProgress {
  totalChapters: number;
  completedChapters: number;
  masteredChapters: number;
  percentComplete: number;
  averageConfidence: number;
}

export interface ParsedSubtopic {
  id: string;
  name: string;
  estimatedMinutes?: number;
  status?: CurriculumStatus;
  confidence?: ConfidenceRating;
}

export interface ParsedTopic {
  id: string;
  name: string;
  estimatedMinutes?: number;
  status?: CurriculumStatus;
  confidence?: ConfidenceRating;
  subtopics: ParsedSubtopic[];
}

export interface ParsedChapter {
  id: string;
  name: string;
  estimatedMinutes?: number;
  status: CurriculumStatus;
  confidence?: ConfidenceRating;
  topics: ParsedTopic[];
}

export interface ParsedUnit {
  id: string;
  name: string;
  estimatedMinutes?: number;
  chapters: ParsedChapter[];
}

export interface ParsedSubject {
  id: string;
  name: string;
  estimatedMinutes?: number;
  units: ParsedUnit[];
}

export interface ParsedCurriculumTree {
  academicYear?: string;
  academicYears?: AcademicYear[];
  subjects: ParsedSubject[];
  units?: ParsedUnit[];
  chapters?: ParsedChapter[];
  topics?: ParsedTopic[];
}

export interface ChapterCanvasLink {
  id: string;
  chapterId: string;
  documentId: string;
  title?: string;
  createdAt: string;
  linkedAt: string;
  updatedAt: string;
}

const STATUS_ORDER: CurriculumStatus[] = [
  'not_started',
  'learning',
  'practicing',
  'revising',
  'completed',
  'mastered'
];

export function isValidStatusTransition(from: CurriculumStatus, to: CurriculumStatus): boolean {
  if (from === to) {
    return true;
  }
  if (to === 'revising' || to === 'practicing') {
    return true;
  }
  const fromIndex = STATUS_ORDER.indexOf(from);
  const toIndex = STATUS_ORDER.indexOf(to);
  if (fromIndex === -1 || toIndex === -1) {
    return false;
  }
  return toIndex === fromIndex + 1;
}

export function transitionStatus(current: CurriculumStatus, next: CurriculumStatus): CurriculumStatus {
  if (!isValidStatusTransition(current, next)) {
    throw new Error(`Invalid curriculum status transition from "${current}" to "${next}"`);
  }
  return next;
}

export function isValidConfidenceRating(rating: unknown): rating is ConfidenceRating {
  return typeof rating === 'number' && Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

export function setConfidenceRating(current: unknown, newRating: number): ConfidenceRating {
  if (!isValidConfidenceRating(newRating)) {
    throw new Error(`Invalid confidence rating: ${newRating}. Expected integer between 1 and 5.`);
  }
  return newRating;
}

export function computeSubjectProgress(
  subjectId: string,
  units: Unit[] = [],
  chapters: Chapter[] = [],
  topics: Topic[] = []
): SubjectProgress {
  const subjectUnitIds = new Set<string>();
  for (const u of units) {
    if (!u.subjectId || u.subjectId === subjectId) {
      subjectUnitIds.add(u.id);
    }
  }

  const subjectChapters = chapters.filter(c => {
    if (c.subjectId) {
      return c.subjectId === subjectId;
    }
    if (subjectUnitIds.size > 0 && c.unitId) {
      return subjectUnitIds.has(c.unitId);
    }
    if (units.length === 0) {
      return true;
    }
    return false;
  });

  const totalChapters = subjectChapters.length;
  let completedChapters = 0;
  let masteredChapters = 0;

  for (const c of subjectChapters) {
    if (c.status === 'completed') {
      completedChapters++;
    } else if (c.status === 'mastered') {
      masteredChapters++;
    }
  }

  const chapterIdSet = new Set(subjectChapters.map(c => c.id));
  const topicsByChapter = new Map<string, number[]>();
  const allTopicConfidences: number[] = [];

  if (Array.isArray(topics) && topics.length > 0) {
    for (const t of topics) {
      if (chapterIdSet.has(t.chapterId) && typeof t.confidence === 'number' && t.confidence >= 1 && t.confidence <= 5) {
        allTopicConfidences.push(t.confidence);
        const list = topicsByChapter.get(t.chapterId) || [];
        list.push(t.confidence);
        topicsByChapter.set(t.chapterId, list);
      }
    }
  }

  const effectiveChapterConfidences: number[] = [];
  for (const c of subjectChapters) {
    if (typeof c.confidence === 'number' && c.confidence >= 1 && c.confidence <= 5) {
      effectiveChapterConfidences.push(c.confidence);
    } else {
      const topConf = topicsByChapter.get(c.id);
      if (topConf && topConf.length > 0) {
        const avg = topConf.reduce((sum, v) => sum + v, 0) / topConf.length;
        effectiveChapterConfidences.push(avg);
      }
    }
  }

  const finalConfidences = effectiveChapterConfidences.length > 0
    ? effectiveChapterConfidences
    : allTopicConfidences;

  const averageConfidence = finalConfidences.length === 0
    ? 0
    : Math.round((finalConfidences.reduce((sum, v) => sum + v, 0) / finalConfidences.length) * 100) / 100;

  const finishedChapters = completedChapters + masteredChapters;
  const percentComplete = totalChapters === 0
    ? 0
    : Math.round((finishedChapters / totalChapters) * 100 * 100) / 100;

  return {
    totalChapters,
    completedChapters,
    masteredChapters,
    percentComplete,
    averageConfidence
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < csvText.length) {
    const char = csvText[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csvText.length && csvText[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        currentField += char;
        i++;
        continue;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
        i++;
        continue;
      }
      if (char === '\r') {
        if (i + 1 < csvText.length && csvText[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      }
      if (char === '\n') {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
        i++;
        continue;
      }
      currentField += char;
      i++;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter(r => r.some(col => col.length > 0));
}

function assembleCurriculumTree(subjects: ParsedSubject[], academicYear?: string): ParsedCurriculumTree {
  const units: ParsedUnit[] = [];
  const chapters: ParsedChapter[] = [];
  const topics: ParsedTopic[] = [];

  for (const s of subjects) {
    for (const u of s.units) {
      units.push(u);
      for (const c of u.chapters) {
        chapters.push(c);
        for (const t of c.topics) {
          topics.push(t);
        }
      }
    }
  }

  return {
    academicYear,
    subjects,
    units,
    chapters,
    topics
  };
}

export function parseSyllabusCsv(csvText: string): ParsedCurriculumTree {
  const rows = parseCsvLines(csvText);
  if (rows.length === 0) {
    return assembleCurriculumTree([]);
  }

  let startIndex = 0;
  let subjectIdx = 0;
  let unitIdx = 1;
  let chapterIdx = 2;
  let topicIdx = 3;
  let subtopicIdx = 4;
  let minutesIdx = 5;

  const firstRowLower = rows[0].map(c => c.toLowerCase().replace(/[^a-z]/g, ''));
  const hasSubjectHeader = firstRowLower.some(c => c.includes('subject'));
  const hasUnitHeader = firstRowLower.some(c => c.includes('unit'));
  const hasChapterHeader = firstRowLower.some(c => c.includes('chapter'));

  if (hasSubjectHeader || hasUnitHeader || hasChapterHeader) {
    startIndex = 1;
    const sFound = firstRowLower.findIndex(c => c.includes('subject'));
    const uFound = firstRowLower.findIndex(c => c.includes('unit'));
    const cFound = firstRowLower.findIndex(c => c.includes('chapter'));
    const tFound = firstRowLower.findIndex(c => c === 'topic' || (c.includes('topic') && !c.includes('subtopic')));
    const stFound = firstRowLower.findIndex(c => c.includes('subtopic'));
    const mFound = firstRowLower.findIndex(c => c.includes('minute') || c.includes('estimated') || c.includes('time'));

    if (sFound !== -1) subjectIdx = sFound;
    if (uFound !== -1) unitIdx = uFound;
    if (cFound !== -1) chapterIdx = cFound;
    if (tFound !== -1) topicIdx = tFound;
    if (stFound !== -1) subtopicIdx = stFound;
    if (mFound !== -1) minutesIdx = mFound;
  }

  const subjectsMap = new Map<string, ParsedSubject>();

  for (let r = startIndex; r < rows.length; r++) {
    const row = rows[r];
    const subjectName = (row[subjectIdx] || '').trim();
    const unitName = (row[unitIdx] || '').trim();
    const chapterName = (row[chapterIdx] || '').trim();
    const topicName = (row[topicIdx] || '').trim();
    const subtopicName = (row[subtopicIdx] || '').trim();
    const minutesRaw = (row[minutesIdx] || '').trim();

    if (!subjectName && !unitName && !chapterName && !topicName && !subtopicName) {
      continue;
    }

    const effectiveSubject = subjectName || 'General Subject';
    const subjectId = `sub-${slugify(effectiveSubject)}`;

    let subject = subjectsMap.get(subjectId);
    if (!subject) {
      subject = {
        id: subjectId,
        name: effectiveSubject,
        units: []
      };
      subjectsMap.set(subjectId, subject);
    }

    if (!unitName && !chapterName && !topicName && !subtopicName) {
      continue;
    }

    const effectiveUnit = unitName || 'General Unit';
    const unitId = `${subjectId}-u-${slugify(effectiveUnit)}`;

    let unit = subject.units.find(u => u.id === unitId);
    if (!unit) {
      unit = {
        id: unitId,
        name: effectiveUnit,
        chapters: []
      };
      subject.units.push(unit);
    }

    if (!chapterName && !topicName && !subtopicName) {
      continue;
    }

    const effectiveChapter = chapterName || 'General Chapter';
    const chapterId = `${unitId}-c-${slugify(effectiveChapter)}`;

    let chapter = unit.chapters.find(c => c.id === chapterId);
    if (!chapter) {
      chapter = {
        id: chapterId,
        name: effectiveChapter,
        status: 'not_started',
        topics: []
      };
      unit.chapters.push(chapter);
    }

    const parsedMinutes = minutesRaw && !isNaN(Number(minutesRaw)) ? Number(minutesRaw) : undefined;

    if (!topicName && !subtopicName) {
      if (parsedMinutes !== undefined) {
        chapter.estimatedMinutes = (chapter.estimatedMinutes || 0) + parsedMinutes;
      }
      continue;
    }

    const effectiveTopic = topicName || 'General Topic';
    const topicId = `${chapterId}-t-${slugify(effectiveTopic)}`;

    let topic = chapter.topics.find(t => t.id === topicId);
    if (!topic) {
      topic = {
        id: topicId,
        name: effectiveTopic,
        status: 'not_started',
        subtopics: []
      };
      chapter.topics.push(topic);
    }

    if (!subtopicName) {
      if (parsedMinutes !== undefined) {
        topic.estimatedMinutes = (topic.estimatedMinutes || 0) + parsedMinutes;
        chapter.estimatedMinutes = (chapter.estimatedMinutes || 0) + parsedMinutes;
      }
      continue;
    }

    const subtopicId = `${topicId}-st-${slugify(subtopicName)}`;
    let subtopic = topic.subtopics.find(st => st.id === subtopicId);
    if (!subtopic) {
      subtopic = {
        id: subtopicId,
        name: subtopicName,
        status: 'not_started',
        estimatedMinutes: parsedMinutes
      };
      topic.subtopics.push(subtopic);
    }

    if (parsedMinutes !== undefined) {
      topic.estimatedMinutes = (topic.estimatedMinutes || 0) + parsedMinutes;
      chapter.estimatedMinutes = (chapter.estimatedMinutes || 0) + parsedMinutes;
    }
  }

  return assembleCurriculumTree(Array.from(subjectsMap.values()));
}

export function parseSyllabusJson(jsonText: string): ParsedCurriculumTree {
  const data = typeof jsonText === 'string' ? JSON.parse(jsonText) : jsonText;

  if (!data) {
    return assembleCurriculumTree([]);
  }

  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === 'object' && ('Subject' in data[0] || 'subject' in data[0])) {
      const csvHeader = 'Subject,Unit,Chapter,Topic,Subtopic,EstimatedMinutes';
      const rows = data.map((item: Record<string, unknown>) => {
        const s = String(item.Subject ?? item.subject ?? '');
        const u = String(item.Unit ?? item.unit ?? '');
        const c = String(item.Chapter ?? item.chapter ?? '');
        const t = String(item.Topic ?? item.topic ?? '');
        const st = String(item.Subtopic ?? item.subtopic ?? '');
        const m = String(item.EstimatedMinutes ?? item.estimatedMinutes ?? item.minutes ?? '');
        return `"${s}","${u}","${c}","${t}","${st}","${m}"`;
      });
      return parseSyllabusCsv([csvHeader, ...rows].join('\n'));
    }

    const subjects: ParsedSubject[] = data.map((s: Record<string, unknown>, sIdx: number) => {
      const subjectName = String(s.name || s.title || `Subject ${sIdx + 1}`);
      const subjectId = String(s.id || `sub-${slugify(subjectName)}`);
      const rawUnits = Array.isArray(s.units) ? s.units : [];

      const units: ParsedUnit[] = rawUnits.map((u: Record<string, unknown>, uIdx: number) => {
        const unitName = String(u.name || u.title || `Unit ${uIdx + 1}`);
        const unitId = String(u.id || `${subjectId}-u-${slugify(unitName)}`);
        const rawChapters = Array.isArray(u.chapters) ? u.chapters : [];

        const chapters: ParsedChapter[] = rawChapters.map((c: Record<string, unknown>, cIdx: number) => {
          const chapterName = String(c.name || c.title || `Chapter ${cIdx + 1}`);
          const chapterId = String(c.id || `${unitId}-c-${slugify(chapterName)}`);
          const status = (c.status as CurriculumStatus) || 'not_started';
          const rawTopics = Array.isArray(c.topics) ? c.topics : [];

          const topics: ParsedTopic[] = rawTopics.map((t: Record<string, unknown>, tIdx: number) => {
            const topicName = String(t.name || t.title || `Topic ${tIdx + 1}`);
            const topicId = String(t.id || `${chapterId}-t-${slugify(topicName)}`);
            const rawSubtopics = Array.isArray(t.subtopics) ? t.subtopics : [];

            const subtopics: ParsedSubtopic[] = rawSubtopics.map((st: Record<string, unknown>, stIdx: number) => {
              const subtopicName = String(st.name || st.title || `Subtopic ${stIdx + 1}`);
              return {
                id: String(st.id || `${topicId}-st-${slugify(subtopicName)}`),
                name: subtopicName,
                status: (st.status as CurriculumStatus) || 'not_started',
                confidence: typeof st.confidence === 'number' ? (st.confidence as ConfidenceRating) : undefined,
                estimatedMinutes: typeof st.estimatedMinutes === 'number' ? st.estimatedMinutes : undefined
              };
            });

            return {
              id: topicId,
              name: topicName,
              status: (t.status as CurriculumStatus) || 'not_started',
              confidence: typeof t.confidence === 'number' ? (t.confidence as ConfidenceRating) : undefined,
              estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : undefined,
              subtopics
            };
          });

          return {
            id: chapterId,
            name: chapterName,
            status,
            confidence: typeof c.confidence === 'number' ? (c.confidence as ConfidenceRating) : undefined,
            estimatedMinutes: typeof c.estimatedMinutes === 'number' ? c.estimatedMinutes : undefined,
            topics
          };
        });

        return {
          id: unitId,
          name: unitName,
          estimatedMinutes: typeof u.estimatedMinutes === 'number' ? u.estimatedMinutes : undefined,
          chapters
        };
      });

      return {
        id: subjectId,
        name: subjectName,
        estimatedMinutes: typeof s.estimatedMinutes === 'number' ? s.estimatedMinutes : undefined,
        units
      };
    });

    return assembleCurriculumTree(subjects);
  }

  const root = (data.syllabus || data.curriculum || data) as Record<string, unknown>;
  const academicYear = typeof root.academicYear === 'string' ? root.academicYear : undefined;

  if (Array.isArray(root.subjects)) {
    const parsed = parseSyllabusJson(JSON.stringify(root.subjects));
    return assembleCurriculumTree(parsed.subjects, academicYear);
  }

  return assembleCurriculumTree([], academicYear);
}

interface OutlineStackEntry {
  indent: number;
  level: number;
  type: 'subject' | 'unit' | 'chapter' | 'topic' | 'subtopic';
  item: ParsedSubject | ParsedUnit | ParsedChapter | ParsedTopic | ParsedSubtopic;
}

export function parseSyllabusIndentedOutline(outlineText: string): ParsedCurriculumTree {
  const lines = outlineText.split(/\r?\n/);
  const subjects: ParsedSubject[] = [];
  const stack: OutlineStackEntry[] = [];
  let detectedAcademicYear: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim()) {
      continue;
    }

    const leadingWhitespace = rawLine.match(/^[\t ]*/)?.[0] || '';
    const indent = leadingWhitespace.replace(/\t/g, '    ').length;
    const trimmed = rawLine.trim();

    const cleanBullet = trimmed.replace(/^([-*+•–—]|\d+[\.)]|\(\d+\))\s+/, '');
    const minutesMatch = cleanBullet.match(/(?:[([,]|\s*-\s*)(\d+)\s*(?:min|mins|minutes|m)[)\]]?\s*$/i);
    const estimatedMinutes = minutesMatch ? parseInt(minutesMatch[1], 10) : undefined;
    const name = (minutesMatch ? cleanBullet.slice(0, minutesMatch.index).trim() : cleanBullet).trim();

    if (!name) {
      continue;
    }

    while (stack.length > 0 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack.length > 0 ? stack[stack.length - 1] : undefined;
    const currentLevel = parent ? parent.level + 1 : 0;

    if (currentLevel === 0) {
      if (/^academic\s*year\b|^grade\s*\d+\b|^class\s*\d+\b/i.test(name) && !detectedAcademicYear) {
        detectedAcademicYear = name;
        continue;
      }

      const subjectId = `sub-${slugify(name)}`;
      const subject: ParsedSubject = {
        id: subjectId,
        name,
        estimatedMinutes,
        units: []
      };
      subjects.push(subject);
      stack.push({ indent, level: 0, type: 'subject', item: subject });
    } else if (currentLevel === 1) {
      const subject = (parent?.type === 'subject' ? parent.item : subjects[subjects.length - 1]) as ParsedSubject;
      if (!subject) {
        continue;
      }
      const unitId = `${subject.id}-u-${slugify(name)}`;
      const unit: ParsedUnit = {
        id: unitId,
        name,
        estimatedMinutes,
        chapters: []
      };
      subject.units.push(unit);
      stack.push({ indent, level: 1, type: 'unit', item: unit });
    } else if (currentLevel === 2) {
      const unit = parent?.item as ParsedUnit;
      if (!unit || !unit.chapters) {
        continue;
      }
      const chapterId = `${unit.id}-c-${slugify(name)}`;
      const chapter: ParsedChapter = {
        id: chapterId,
        name,
        status: 'not_started',
        estimatedMinutes,
        topics: []
      };
      unit.chapters.push(chapter);
      stack.push({ indent, level: 2, type: 'chapter', item: chapter });
    } else if (currentLevel === 3) {
      const chapter = parent?.item as ParsedChapter;
      if (!chapter || !chapter.topics) {
        continue;
      }
      const topicId = `${chapter.id}-t-${slugify(name)}`;
      const topic: ParsedTopic = {
        id: topicId,
        name,
        status: 'not_started',
        estimatedMinutes,
        subtopics: []
      };
      chapter.topics.push(topic);
      stack.push({ indent, level: 3, type: 'topic', item: topic });
    } else {
      const topic = (parent?.type === 'topic' ? parent.item : undefined) as ParsedTopic | undefined;
      if (!topic || !topic.subtopics) {
        continue;
      }
      const subtopicId = `${topic.id}-st-${slugify(name)}`;
      const subtopic: ParsedSubtopic = {
        id: subtopicId,
        name,
        status: 'not_started',
        estimatedMinutes
      };
      topic.subtopics.push(subtopic);
      stack.push({ indent, level: currentLevel, type: 'subtopic', item: subtopic });
    }
  }

  return assembleCurriculumTree(subjects, detectedAcademicYear);
}

const canvasSidecarRegistry = new Map<string, ChapterCanvasLink>();

export function linkChapterToCanvas(
  chapterId: string,
  documentId: string,
  title?: string
): ChapterCanvasLink {
  const key = `${chapterId}::${documentId}`;
  const now = new Date().toISOString();
  const existing = canvasSidecarRegistry.get(key);

  if (existing) {
    if (title !== undefined) {
      existing.title = title;
    }
    existing.updatedAt = now;
    return { ...existing };
  }

  const link: ChapterCanvasLink = {
    id: `link_${chapterId}_${documentId}`,
    chapterId,
    documentId,
    title,
    createdAt: now,
    linkedAt: now,
    updatedAt: now
  };

  canvasSidecarRegistry.set(key, link);
  return { ...link };
}

export function getChapterCanvasLinks(chapterId: string): ChapterCanvasLink[] {
  const matches: ChapterCanvasLink[] = [];
  for (const link of canvasSidecarRegistry.values()) {
    if (link.chapterId === chapterId) {
      matches.push({ ...link });
    }
  }
  return matches;
}

export function unlinkChapterFromCanvas(chapterId: string, documentId: string): boolean {
  const key = `${chapterId}::${documentId}`;
  return canvasSidecarRegistry.delete(key);
}

export function clearChapterCanvasLinks(chapterId?: string): void {
  if (chapterId) {
    for (const [key, link] of canvasSidecarRegistry.entries()) {
      if (link.chapterId === chapterId) {
        canvasSidecarRegistry.delete(key);
      }
    }
  } else {
    canvasSidecarRegistry.clear();
  }
}

export function getCanvasDocumentChapters(documentId: string): ChapterCanvasLink[] {
  const matches: ChapterCanvasLink[] = [];
  for (const link of canvasSidecarRegistry.values()) {
    if (link.documentId === documentId) {
      matches.push({ ...link });
    }
  }
  return matches;
}

export function exportChapterCanvasLinks(): ChapterCanvasLink[] {
  return Array.from(canvasSidecarRegistry.values()).map(link => ({ ...link }));
}

export function importChapterCanvasLinks(links: ChapterCanvasLink[]): void {
  for (const link of links) {
    const key = `${link.chapterId}::${link.documentId}`;
    canvasSidecarRegistry.set(key, { ...link });
  }
}
