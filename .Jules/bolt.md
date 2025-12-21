# Bolt Journal

## 2025-12-20 - Redundant List Processing in React Render Cycle
**Learning:** Found an IIFE (Immediately Invoked Function Expression) performing expensive filtering and `JSON.parse` operations directly inside the JSX return statement, duplicating logic already present in the component body.
**Action:** Always check for heavy logic defined inline within JSX. Move data transformation logic (filtering, sorting, grouping) into `useMemo` hooks to prevent recalculation on unrelated state changes (like typing in a text input).

## 2025-12-20 - Synchronous LocalStorage in Render Loop
**Learning:** `SessionList` calls `getArchivedSessions` (which reads `localStorage` and parses JSON) on every render cycle. This blocks the main thread and causes jank, especially during interactions like typing in the search box.
**Action:** Move `localStorage` reads to `useEffect` or `useState` initialization. Treat `localStorage` as an external side effect, not a derived value for rendering.