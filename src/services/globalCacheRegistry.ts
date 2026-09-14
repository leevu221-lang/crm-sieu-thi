/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Central registry of all module-level caches in the app.
 * 
 * WHY THIS EXISTS: The app uses many module-level (file-scope) caches for
 * performance — Map, Record, plain objects that live OUTSIDE the React tree.
 * When a user logs out and another user logs in on the same browser tab,
 * window.location.replace() normally kills all JS memory and reloads fresh.
 * But if the redirect is delayed (800ms timeout) or fails, stale data from
 * the previous user's session can leak into the new user's session.
 *
 * Each module registers its cache-clearing function here at import time.
 * AuthContext calls clearAllGlobalCaches() during both login AND logout
 * to guarantee zero data contamination between user accounts.
 */

const cacheCleaners: Array<() => void> = [];

/**
 * Register a function that clears a module-level cache.
 * Called at module import time (top-level side effect).
 */
export function registerCacheCleaner(cleaner: () => void): void {
  if (!cacheCleaners.includes(cleaner)) {
    cacheCleaners.push(cleaner);
  }
}

/**
 * Clear ALL registered module-level caches.
 * Called by AuthContext during login/logout to prevent data leakage.
 */
export function clearAllGlobalCaches(): void {
  for (const cleaner of cacheCleaners) {
    try { cleaner(); } catch {}
  }
}
