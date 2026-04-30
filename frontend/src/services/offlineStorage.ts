const DB_NAME = "fly_offline";
const DB_VERSION = 1;
const STORE_TESTS = "mock_tests";
const STORE_QUESTIONS = "mock_questions";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_TESTS)) {
        db.createObjectStore(STORE_TESTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_QUESTIONS)) {
        db.createObjectStore(STORE_QUESTIONS, { keyPath: "mockTestId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(db: IDBDatabase, store: string, data: any): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function dbGet(db: IDBDatabase, store: string, key: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbGetAll(db: IDBDatabase, store: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

function dbDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function saveTestOffline(
  mockTest: any,
  questions: any[],
): Promise<void> {
  const db = await openDB();
  await dbPut(db, STORE_TESTS, { ...mockTest, cachedAt: Date.now() });
  await dbPut(db, STORE_QUESTIONS, {
    mockTestId: mockTest.id,
    questions,
    cachedAt: Date.now(),
  });
  db.close();
}

export async function getOfflineTest(mockTestId: string): Promise<any | null> {
  try {
    const db = await openDB();
    const test = await dbGet(db, STORE_TESTS, mockTestId);
    db.close();
    return test || null;
  } catch {
    return null;
  }
}

export async function getOfflineQuestions(mockTestId: string): Promise<any[] | null> {
  try {
    const db = await openDB();
    const entry = await dbGet(db, STORE_QUESTIONS, mockTestId);
    db.close();
    return entry?.questions || null;
  } catch {
    return null;
  }
}

export async function getAllOfflineTests(): Promise<any[]> {
  try {
    const db = await openDB();
    const tests = await dbGetAll(db, STORE_TESTS);
    db.close();
    return tests;
  } catch {
    return [];
  }
}

export async function deleteOfflineTest(mockTestId: string): Promise<void> {
  const db = await openDB();
  await dbDelete(db, STORE_TESTS, mockTestId);
  await dbDelete(db, STORE_QUESTIONS, mockTestId);
  db.close();
}

export async function isTestOffline(mockTestId: string): Promise<boolean> {
  const t = await getOfflineTest(mockTestId);
  return !!t;
}

export function formatCacheSize(questions: any[]): string {
  const bytes = JSON.stringify(questions).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
