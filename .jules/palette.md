## 2024-05-16 - Search Empty State Layout Break
**Learning:** Returning early on an empty search result (`visibleSessions.length === 0`) replaces the entire component view. If the search bar itself is part of that component, the user gets trapped on the empty state with no way to clear the search query.
**Action:** Always render empty states *inside* the list container rather than replacing the parent component, ensuring filter controls remain accessible.
