/* =====================================================
   filters.js - SEARCH, FILTER, AND SORT
   Works out WHICH suggestions to show, and in WHAT order.
   It reads the toolbar controls, so search, filters,
   and sort all work together.
   ===================================================== */

import { state, saveFilters, loadFilters, clearSavedFilters } from './data.js';
import { searchInput, categoryFilter, statusFilter, sortSelect } from './elements.js';

// Returns the list of suggestions to show on the board
export function getVisibleSuggestions() {
  // Read what the user typed or chose
  const searchText = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;
  const status = statusFilter.value;

  // Keep only the suggestions that match ALL the choices
  const matches = state.suggestions.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchText) ||
      item.description.toLowerCase().includes(searchText);
    const matchesCategory = category === '' || item.category === category;
    const matchesStatus = status === '' || item.status === status;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return sortList(matches, sortSelect.value);
}

// Compares two suggestions: the one with MORE votes goes first.
// If the votes are equal, the NEWER one goes first.
// (sort() uses a function like this to decide the order)
export function compareByVotes(a, b) {
  return (b.voters.length - a.voters.length) || (b.createdAt - a.createdAt);
}

// Puts the list in order. The "mode" comes from the Sort dropdown.
function sortList(list, mode) {
  const sorted = [...list];   // sort a copy, so the original list keeps its order

  switch (mode) {
    case 'newest':
      sorted.sort((a, b) => b.createdAt - a.createdAt);
      break;
    case 'oldest':
      sorted.sort((a, b) => a.createdAt - b.createdAt);
      break;
    default:
      // "Most votes"
      sorted.sort(compareByVotes);
  }

  return sorted;
}

// Puts the search box and dropdowns back to their starting values
export function clearFilterControls() {
  searchInput.value = '';
  categoryFilter.value = '';
  statusFilter.value = '';
  sortSelect.value = 'votes';
  clearSavedFilters();   // forget the saved choices too
}

// Saves what the user chose, so a refresh does not lose it (sessionStorage)
export function saveFilterChoices() {
  saveFilters({
    search: searchInput.value,
    category: categoryFilter.value,
    status: statusFilter.value,
    sort: sortSelect.value
  });
}

// Puts the saved choices back into the search box and dropdowns
export function restoreFilterChoices() {
  const saved = loadFilters();
  if (saved === null) {
    return;   // nothing was saved
  }

  searchInput.value = saved.search;
  categoryFilter.value = saved.category;
  statusFilter.value = saved.status;
  sortSelect.value = saved.sort;

  // If a saved value is not one of the dropdown options, the dropdown goes blank.
  // In that case we go back to the starting value.
  if (categoryFilter.value !== saved.category) { categoryFilter.value = ''; }
  if (statusFilter.value !== saved.status) { statusFilter.value = ''; }
  if (sortSelect.value !== saved.sort) { sortSelect.value = 'votes'; }
}
