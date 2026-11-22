import { state, loadData, loadUser } from './data.js';
import {
  signinForm, studentIdInput, regStudentId, appScreen, suggestionList, logoutButton,
  searchInput, categoryFilter, statusFilter, sortSelect, clearFiltersButton,
  newSuggestionButton, suggestionForm, titleInput, categoryInput, descriptionInput, cancelButton,
  tabSignin, tabRegister, registerForm
} from './elements.js';
import { showSignIn, showApp, refreshBoard, showLoadErrorIfNeeded } from './ui.js';
import { restoreFilterChoices } from './filters.js';
import { handleStorageChange } from './sync.js';
import { handleSignIn, handleLogout, handleRegister, handleTabSignin, handleTabRegister, formatStudentIdInput } from './auth.js';
import {
  handleListClick, handleListChange, sortSuggestions, searchSuggestions,
  filterByCategory, filterByStatus, resetFilters
} from './board.js';
import { openNewForm, handleCancel, updateCharCounter, saveDraftFromForm, handleFormSubmit } from './form.js';

// Connect events to functions
function setupEventListeners() {
  signinForm.addEventListener('submit', handleSignIn);
  registerForm.addEventListener('submit', handleRegister);
  studentIdInput.addEventListener('input', formatStudentIdInput);
  regStudentId.addEventListener('input', formatStudentIdInput);
  tabSignin.addEventListener('click', handleTabSignin);
  tabRegister.addEventListener('click', handleTabRegister);
  logoutButton.addEventListener('click', handleLogout);

  // Board: ONE listener on the list handles all card buttons (event delegation)
  suggestionList.addEventListener('click', handleListClick);
  suggestionList.addEventListener('change', handleListChange);

  // Toolbar: search, filters, and sort
  searchInput.addEventListener('input', searchSuggestions);
  categoryFilter.addEventListener('change', filterByCategory);
  statusFilter.addEventListener('change', filterByStatus);
  sortSelect.addEventListener('change', sortSuggestions);
  clearFiltersButton.addEventListener('click', resetFilters);

  // Suggestion form
  newSuggestionButton.addEventListener('click', openNewForm);
  suggestionForm.addEventListener('submit', handleFormSubmit);
  titleInput.addEventListener('input', updateCharCounter);
  descriptionInput.addEventListener('input', updateCharCounter);
  cancelButton.addEventListener('click', handleCancel);

  // Save an unfinished draft while the user types (sessionStorage)
  titleInput.addEventListener('input', saveDraftFromForm);
  descriptionInput.addEventListener('input', saveDraftFromForm);
  categoryInput.addEventListener('change', saveDraftFromForm);

  // Live sync: runs when ANOTHER tab changes localStorage
  window.addEventListener('storage', handleStorageChange);
}

// Runs once when the page opens (event 1)
// It is "async" because loading the data may have to wait.
async function init() {
  // Safety check: stop if an important element is missing in index.html
  if (!signinForm || !appScreen || !suggestionList) {
    console.error('OrgVoice: a required element is missing in index.html.');
    return;
  }

  setupEventListeners();
  loadUser();
  restoreFilterChoices();   // put back the search and filter choices from before a refresh

  // Show a screen right away. If the user is signed in, the board says "Loading suggestions..."
  if (state.currentUser !== null) {
    showApp();
  } else {
    showSignIn();
  }

  await loadData();         // wait for the suggestions
  state.loading = false;

  if (state.currentUser !== null) {
    refreshBoard();         // now show the real cards
    showLoadErrorIfNeeded();
  }
}

document.addEventListener('DOMContentLoaded', init);