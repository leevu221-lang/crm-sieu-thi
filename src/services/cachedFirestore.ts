/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared read-cache for "rarely changes" Firestore config documents
// (category mapping rules, feature flags, static settings, etc).
//
// WHY THIS EXISTS: each onSnapshot() listener re-reads its document every time
// the component mounts, and — much more importantly at scale — every listener
// that is open when the document is edited gets billed a fresh read. With ~1000
// concurrent users all holding listeners open on the same handful of rarely
// changing config docs, a single admin edit (or simply everyone loading the app
// during the day) can burn thousands of reads for data that changes a few times
// a month. getCachedDoc() replaces that pattern with a single one-time read that
// is reused (in-memory + localStorage, both TTL-bound) across every caller/mount
// until it actually goes stale.
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface CacheEntry<T> {
  data: T | null;
  ts: number;
}

const memCache = new Map<string, CacheEntry<any>>();
const inFlight = new Map<string, Promise<any>>();

const lsKey = (collectionName: string, docId: string) => `fbcache_${collectionName}_${docId}`;

/**
 * Read a Firestore document with a TTL cache (in-memory first, then localStorage,
 * then network). Concurrent calls for the same doc share a single in-flight request.
 */
export async function getCachedDoc<T = DocumentData>(
  collectionName: string,
  docId: string,
  ttlMs: number = 15 * 60 * 1000
): Promise<T | null> {
  const key = `${collectionName}/${docId}`;
  const now = Date.now();

  const mem = memCache.get(key);
  if (mem && now - mem.ts < ttlMs) return mem.data;

  if (!mem) {
    try {
      const raw = localStorage.getItem(lsKey(collectionName, docId));
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (now - parsed.ts < ttlMs) {
          memCache.set(key, parsed);
          return parsed.data;
        }
      }
    } catch {}
  }

  const pending = inFlight.get(key);
  if (pending) return pending;

  const fetchPromise = (async () => {
    try {
      const snap = await getDoc(doc(db, collectionName, docId));
      const data = (snap.exists() ? snap.data() : null) as T | null;
      const entry: CacheEntry<T> = { data, ts: Date.now() };
      memCache.set(key, entry);
      try { localStorage.setItem(lsKey(collectionName, docId), JSON.stringify(entry)); } catch {}
      return data;
    } finally {
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, fetchPromise);
  return fetchPromise;
}

/** Force the next getCachedDoc() call to hit the network again — call after writing. */
export function invalidateCachedDoc(collectionName: string, docId: string) {
  const key = `${collectionName}/${docId}`;
  memCache.delete(key);
  try { localStorage.removeItem(lsKey(collectionName, docId)); } catch {}
}

/** Seed the cache directly (e.g. right after a successful write) to avoid a round-trip. */
export function setCachedDoc<T = DocumentData>(collectionName: string, docId: string, data: T) {
  const key = `${collectionName}/${docId}`;
  const entry: CacheEntry<T> = { data, ts: Date.now() };
  memCache.set(key, entry);
  try { localStorage.setItem(lsKey(collectionName, docId), JSON.stringify(entry)); } catch {}
}
