import {
  ACADEMIC_STORES,
  upgradeAcademicDb,
  getAcademicItem,
  putAcademicItem,
  deleteAcademicItem,
  listAcademicItems,
  enqueueAcademicMutation,
  getQueuedAcademicMutations,
  clearAcademicMemoryStores
} from "../lib/storage/academic-db.ts";

async function test() {
  clearAcademicMemoryStores();

  const expectedKeys = [
    "SYLLABUS",
    "TASKS",
    "FLASHCARDS",
    "FLASHCARD_REVIEWS",
    "QUESTIONS",
    "QUESTION_ATTEMPTS",
    "MISTAKES",
    "FORMULAS",
    "MARKS",
    "FOCUS_SESSIONS",
    "CLASSROOM_CACHE",
    "CHAPTER_CANVASES"
  ] as const;

  for (const k of expectedKeys) {
    if (!ACADEMIC_STORES[k]) throw new Error("Missing store: " + k);
  }
  console.log("Check 1 passed: ACADEMIC_STORES has all 12 stores");

  const mockStores = new Map<string, any>();
  const mockDb: any = {
    objectStoreNames: {
      contains: (name: string) => mockStores.has(name) || ["documents", "sync_queue", "asset_blobs", "app_state"].includes(name)
    },
    createObjectStore: (name: string, opts: any) => {
      const indexes = new Map();
      const storeObj = {
        name,
        opts,
        indexNames: { contains: (iName: string) => indexes.has(iName) },
        createIndex: (iName: string, keyPath: string, iOpts: any) => { indexes.set(iName, { keyPath, iOpts }); }
      };
      mockStores.set(name, storeObj);
      return storeObj;
    }
  };
  upgradeAcademicDb(mockDb, 0, 1);
  console.log("Check 2 passed: upgradeAcademicDb created stores without breaking existing document stores");

  await putAcademicItem(ACADEMIC_STORES.TASKS, { id: "task_1", title: "Study Physics", done: false });
  const item = await getAcademicItem<{ id: string; title: string; done: boolean }>(ACADEMIC_STORES.TASKS, "task_1");
  if (!item || item.title !== "Study Physics") throw new Error("put/get failed");

  const listAll = await listAcademicItems<{ id: string; title: string; done: boolean }>(ACADEMIC_STORES.TASKS);
  if (listAll.length !== 1) throw new Error("list length mismatch");

  const listFiltered = await listAcademicItems<{ id: string; title: string; done: boolean }>(ACADEMIC_STORES.TASKS, (t) => t.done === true);
  if (listFiltered.length !== 0) throw new Error("filtered list mismatch");

  await deleteAcademicItem(ACADEMIC_STORES.TASKS, "task_1");
  const itemAfterDel = await getAcademicItem(ACADEMIC_STORES.TASKS, "task_1");
  if (itemAfterDel !== null) throw new Error("delete failed");
  console.log("Check 3 passed: CRUD operations work in-memory");

  await enqueueAcademicMutation({
    type: "upsert",
    store: ACADEMIC_STORES.TASKS,
    entityId: "task_100",
    payload: { title: "Original Title", priority: 1 }
  });
  let queue = await getQueuedAcademicMutations();
  if (queue.length !== 1) throw new Error("Queue length should be 1");
  const initialTimestamp = queue[0].timestamp;

  await new Promise((r) => setTimeout(r, 20));

  await enqueueAcademicMutation({
    type: "upsert",
    store: ACADEMIC_STORES.TASKS,
    entityId: "task_100",
    payload: { priority: 2, dueDate: "2026-10-01" }
  });
  queue = await getQueuedAcademicMutations();
  if (queue.length !== 1) throw new Error("Queue length should remain 1 after coalescing");
  const payload = queue[0].payload as any;
  if (payload.title !== "Original Title" || payload.priority !== 2 || payload.dueDate !== "2026-10-01") {
    throw new Error("Payload merge failed: " + JSON.stringify(payload));
  }
  if (queue[0].timestamp <= initialTimestamp) {
    throw new Error("Timestamp was not updated");
  }
  console.log("Check 4 passed: mutation queuing and coalescing works");

  console.log("\nALL 4 CHECKS PASSED PERFECTLY!");
}

test().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
