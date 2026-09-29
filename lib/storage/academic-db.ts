export const ACADEMIC_STORES = {
  SYLLABUS: "academic_syllabus",
  TASKS: "academic_tasks",
  FLASHCARDS: "academic_flashcards",
  FLASHCARD_REVIEWS: "academic_flashcard_reviews",
  QUESTIONS: "academic_questions",
  QUESTION_ATTEMPTS: "academic_question_attempts",
  MISTAKES: "academic_mistakes",
  FORMULAS: "academic_formulas",
  MARKS: "academic_marks",
  FOCUS_SESSIONS: "academic_focus_sessions",
  CLASSROOM_CACHE: "academic_classroom_cache",
  CHAPTER_CANVASES: "academic_chapter_canvases",
} as const;

export type AcademicStoreName =
  (typeof ACADEMIC_STORES)[keyof typeof ACADEMIC_STORES];

export const ACADEMIC_MUTATIONS_STORE = "academic_mutations";

export const ACADEMIC_DB_NAME = "zenithsui-academic-db";
export const ACADEMIC_DB_VERSION = 1;

export interface QueuedAcademicMutation {
  id: string;
  type: string;
  store: string;
  entityId: string;
  payload: unknown;
  timestamp: number;
}

export type AcademicMutationInput = {
  type: string;
  store: string;
  entityId: string;
  payload: unknown;
};

interface StoreIndexDef {
  name: string;
  keyPath: string;
  unique?: boolean;
}

interface StoreDef {
  keyPath: string;
  indexes?: StoreIndexDef[];
}

const STORE_DEFINITIONS: Record<string, StoreDef> = {
  [ACADEMIC_STORES.SYLLABUS]: {
    keyPath: "id",
    indexes: [
      { name: "by_subject", keyPath: "subject" },
      { name: "by_courseId", keyPath: "courseId" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.TASKS]: {
    keyPath: "id",
    indexes: [
      { name: "by_status", keyPath: "status" },
      { name: "by_dueDate", keyPath: "dueDate" },
      { name: "by_subject", keyPath: "subject" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.FLASHCARDS]: {
    keyPath: "id",
    indexes: [
      { name: "by_deckId", keyPath: "deckId" },
      { name: "by_subject", keyPath: "subject" },
      { name: "by_nextReview", keyPath: "nextReview" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.FLASHCARD_REVIEWS]: {
    keyPath: "id",
    indexes: [
      { name: "by_cardId", keyPath: "cardId" },
      { name: "by_reviewedAt", keyPath: "reviewedAt" },
    ],
  },
  [ACADEMIC_STORES.QUESTIONS]: {
    keyPath: "id",
    indexes: [
      { name: "by_subject", keyPath: "subject" },
      { name: "by_topic", keyPath: "topic" },
      { name: "by_difficulty", keyPath: "difficulty" },
      { name: "by_type", keyPath: "type" },
    ],
  },
  [ACADEMIC_STORES.QUESTION_ATTEMPTS]: {
    keyPath: "id",
    indexes: [
      { name: "by_questionId", keyPath: "questionId" },
      { name: "by_testId", keyPath: "testId" },
      { name: "by_attemptedAt", keyPath: "attemptedAt" },
    ],
  },
  [ACADEMIC_STORES.MISTAKES]: {
    keyPath: "id",
    indexes: [
      { name: "by_subject", keyPath: "subject" },
      { name: "by_questionId", keyPath: "questionId" },
      { name: "by_status", keyPath: "status" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.FORMULAS]: {
    keyPath: "id",
    indexes: [
      { name: "by_subject", keyPath: "subject" },
      { name: "by_category", keyPath: "category" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.MARKS]: {
    keyPath: "id",
    indexes: [
      { name: "by_examId", keyPath: "examId" },
      { name: "by_subject", keyPath: "subject" },
      { name: "by_date", keyPath: "date" },
    ],
  },
  [ACADEMIC_STORES.FOCUS_SESSIONS]: {
    keyPath: "id",
    indexes: [
      { name: "by_subject", keyPath: "subject" },
      { name: "by_startTime", keyPath: "startTime" },
      { name: "by_status", keyPath: "status" },
    ],
  },
  [ACADEMIC_STORES.CLASSROOM_CACHE]: {
    keyPath: "id",
    indexes: [
      { name: "by_courseId", keyPath: "courseId" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_STORES.CHAPTER_CANVASES]: {
    keyPath: "id",
    indexes: [
      { name: "by_chapterId", keyPath: "chapterId" },
      { name: "by_subject", keyPath: "subject" },
      { name: "by_updatedAt", keyPath: "updatedAt" },
    ],
  },
  [ACADEMIC_MUTATIONS_STORE]: {
    keyPath: "id",
    indexes: [
      { name: "by_entityId", keyPath: "entityId" },
      { name: "by_store", keyPath: "store" },
      { name: "by_timestamp", keyPath: "timestamp" },
    ],
  },
};

const memoryStores = new Map<string, Map<string, unknown>>();
const memoryMutationQueue: QueuedAcademicMutation[] = [];
let dbInstance: IDBDatabase | null = null;

function isIndexedDBAvailable(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.indexedDB !== "undefined" &&
      window.indexedDB !== null
    );
  } catch {
    return false;
  }
}

function getMemoryStore(storeName: string): Map<string, unknown> {
  let store = memoryStores.get(storeName);
  if (!store) {
    store = new Map<string, unknown>();
    memoryStores.set(storeName, store);
  }
  return store;
}

function deepClone<T>(val: T): T {
  if (val === undefined || val === null) {
    return val;
  }
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(val);
    } catch {
      return JSON.parse(JSON.stringify(val));
    }
  }
  return JSON.parse(JSON.stringify(val));
}

function isUpsertMutationType(type: string): boolean {
  const lower = type.toLowerCase();
  return (
    lower.includes("upsert") ||
    lower.includes("update") ||
    lower.includes("put") ||
    lower.includes("set") ||
    lower.includes("save") ||
    lower === "create"
  );
}

export function upgradeAcademicDb(
  db: IDBDatabase,
  oldVersion: number,
  newVersion: number
): void {
  for (const [storeName, def] of Object.entries(STORE_DEFINITIONS)) {
    if (!db.objectStoreNames.contains(storeName)) {
      const store = db.createObjectStore(storeName, { keyPath: def.keyPath });
      if (def.indexes) {
        for (const idx of def.indexes) {
          if (!store.indexNames.contains(idx.name)) {
            store.createIndex(idx.name, idx.keyPath, {
              unique: idx.unique ?? false,
            });
          }
        }
      }
    }
  }
}

export function openAcademicDb(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(
      ACADEMIC_DB_NAME,
      ACADEMIC_DB_VERSION
    );

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      upgradeAcademicDb(
        db,
        event.oldVersion,
        event.newVersion ?? ACADEMIC_DB_VERSION
      );
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      dbInstance.onclose = () => {
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function withAcademicTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  callback: (transaction: IDBTransaction) => Promise<T> | T
): Promise<T> {
  const db = await openAcademicDb();
  const tx = db.transaction(storeNames, mode);

  return new Promise<T>((resolve, reject) => {
    let result: T;

    Promise.resolve()
      .then(() => callback(tx))
      .then((res) => {
        result = res;
      })
      .catch((err) => {
        tx.abort();
        reject(err);
      });

    tx.oncomplete = () => {
      resolve(result);
    };

    tx.onerror = () => {
      reject(tx.error);
    };

    tx.onabort = () => {
      reject(tx.error || new Error("Transaction aborted"));
    };
  });
}

export async function getAcademicItem<T>(
  storeName: string,
  id: string
): Promise<T | null> {
  if (!isIndexedDBAvailable()) {
    const store = getMemoryStore(storeName);
    const item = store.get(id);
    if (item === undefined) {
      return null;
    }
    return deepClone(item as T);
  }

  try {
    const db = await openAcademicDb();
    return new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result === undefined) {
          resolve(null);
        } else {
          resolve(req.result as T);
        }
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    const store = getMemoryStore(storeName);
    const item = store.get(id);
    if (item === undefined) {
      return null;
    }
    return deepClone(item as T);
  }
}

export async function putAcademicItem<T extends { id: string }>(
  storeName: string,
  item: T
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const store = getMemoryStore(storeName);
    store.set(item.id, deepClone(item));
    return;
  }

  try {
    const db = await openAcademicDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.put(item);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch {
    const store = getMemoryStore(storeName);
    store.set(item.id, deepClone(item));
  }
}

export async function deleteAcademicItem(
  storeName: string,
  id: string
): Promise<void> {
  if (!isIndexedDBAvailable()) {
    const store = getMemoryStore(storeName);
    store.delete(id);
    return;
  }

  try {
    const db = await openAcademicDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      const req = store.delete(id);

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch {
    const store = getMemoryStore(storeName);
    store.delete(id);
  }
}

export async function listAcademicItems<T>(
  storeName: string,
  filter?: (item: T) => boolean
): Promise<T[]> {
  if (!isIndexedDBAvailable()) {
    const store = getMemoryStore(storeName);
    const all = Array.from(store.values()).map((val) => deepClone(val as T));
    if (filter) {
      return all.filter(filter);
    }
    return all;
  }

  try {
    const db = await openAcademicDb();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = (req.result as T[]) || [];
        if (filter) {
          resolve(all.filter(filter));
        } else {
          resolve(all);
        }
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    const store = getMemoryStore(storeName);
    const all = Array.from(store.values()).map((val) => deepClone(val as T));
    if (filter) {
      return all.filter(filter);
    }
    return all;
  }
}

export async function enqueueAcademicMutation(mutation: {
  type: string;
  store: string;
  entityId: string;
  payload: unknown;
}): Promise<void> {
  if (!isIndexedDBAvailable()) {
    if (isUpsertMutationType(mutation.type)) {
      const existing = memoryMutationQueue.find(
        (m) =>
          m.entityId === mutation.entityId &&
          isUpsertMutationType(m.type) &&
          (!mutation.store || m.store === mutation.store)
      );
      if (existing) {
        if (
          existing.payload &&
          typeof existing.payload === "object" &&
          !Array.isArray(existing.payload) &&
          mutation.payload &&
          typeof mutation.payload === "object" &&
          !Array.isArray(mutation.payload)
        ) {
          existing.payload = {
            ...(existing.payload as Record<string, unknown>),
            ...(mutation.payload as Record<string, unknown>),
          };
        } else {
          existing.payload = deepClone(mutation.payload);
        }
        existing.timestamp = Date.now();
        return;
      }
    }

    memoryMutationQueue.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: mutation.type,
      store: mutation.store,
      entityId: mutation.entityId,
      payload: deepClone(mutation.payload),
      timestamp: Date.now(),
    });
    return;
  }

  try {
    const db = await openAcademicDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACADEMIC_MUTATIONS_STORE, "readwrite");
      const store = tx.objectStore(ACADEMIC_MUTATIONS_STORE);
      const index = store.index("by_entityId");
      const req = index.getAll(mutation.entityId);

      req.onsuccess = () => {
        const existingList = (req.result as QueuedAcademicMutation[]) || [];
        const existingUpsert = existingList.find(
          (m) =>
            isUpsertMutationType(m.type) &&
            (!mutation.store || m.store === mutation.store)
        );

        if (isUpsertMutationType(mutation.type) && existingUpsert) {
          if (
            existingUpsert.payload &&
            typeof existingUpsert.payload === "object" &&
            !Array.isArray(existingUpsert.payload) &&
            mutation.payload &&
            typeof mutation.payload === "object" &&
            !Array.isArray(mutation.payload)
          ) {
            existingUpsert.payload = {
              ...(existingUpsert.payload as Record<string, unknown>),
              ...(mutation.payload as Record<string, unknown>),
            };
          } else {
            existingUpsert.payload = deepClone(mutation.payload);
          }
          existingUpsert.timestamp = Date.now();
          store.put(existingUpsert);
        } else {
          const item: QueuedAcademicMutation = {
            id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: mutation.type,
            store: mutation.store,
            entityId: mutation.entityId,
            payload: deepClone(mutation.payload),
            timestamp: Date.now(),
          };
          store.put(item);
        }
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch {
    if (isUpsertMutationType(mutation.type)) {
      const existing = memoryMutationQueue.find(
        (m) =>
          m.entityId === mutation.entityId &&
          isUpsertMutationType(m.type) &&
          (!mutation.store || m.store === mutation.store)
      );
      if (existing) {
        if (
          existing.payload &&
          typeof existing.payload === "object" &&
          !Array.isArray(existing.payload) &&
          mutation.payload &&
          typeof mutation.payload === "object" &&
          !Array.isArray(mutation.payload)
        ) {
          existing.payload = {
            ...(existing.payload as Record<string, unknown>),
            ...(mutation.payload as Record<string, unknown>),
          };
        } else {
          existing.payload = deepClone(mutation.payload);
        }
        existing.timestamp = Date.now();
        return;
      }
    }

    memoryMutationQueue.push({
      id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type: mutation.type,
      store: mutation.store,
      entityId: mutation.entityId,
      payload: deepClone(mutation.payload),
      timestamp: Date.now(),
    });
  }
}

export async function getQueuedAcademicMutations(): Promise<
  QueuedAcademicMutation[]
> {
  if (!isIndexedDBAvailable()) {
    return memoryMutationQueue
      .map((m) => deepClone(m))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  try {
    const db = await openAcademicDb();
    return new Promise<QueuedAcademicMutation[]>((resolve, reject) => {
      const tx = db.transaction(ACADEMIC_MUTATIONS_STORE, "readonly");
      const store = tx.objectStore(ACADEMIC_MUTATIONS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result as QueuedAcademicMutation[]) || [];
        list.sort((a, b) => a.timestamp - b.timestamp);
        resolve(list);
      };

      req.onerror = () => {
        reject(req.error);
      };
    });
  } catch {
    return memoryMutationQueue
      .map((m) => deepClone(m))
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

export async function clearAcademicMutations(): Promise<void> {
  memoryMutationQueue.length = 0;
  if (!isIndexedDBAvailable()) {
    return;
  }

  try {
    const db = await openAcademicDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ACADEMIC_MUTATIONS_STORE, "readwrite");
      const store = tx.objectStore(ACADEMIC_MUTATIONS_STORE);
      const req = store.clear();

      req.onsuccess = () => {
        resolve();
      };

      req.onerror = () => {
        reject(req.error);
      };

      tx.onerror = () => {
        reject(tx.error);
      };
    });
  } catch {}
}

export function clearAcademicMemoryStores(): void {
  memoryStores.clear();
  memoryMutationQueue.length = 0;
}
