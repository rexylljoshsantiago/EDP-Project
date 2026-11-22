import { state, saveData, STATUSES } from './data.js';
import { clearFilterControls, saveFilterChoices } from './filters.js';
import { refreshBoard, showBoardMessage } from './ui.js';
import { openEditForm } from './form.js';


/* ---------- Upvoting (event 6) ---------- */

// Because we save student IDs in the voters list, one person can only vote once.
function toggleVote(id) {
  const suggestion = state.suggestions.find(item => item.id === id);
  if (!suggestion) {
    return;   // the suggestion was not found, so do nothing
  }

  const myId = state.currentUser.id;
  const position = suggestion.voters.indexOf(myId);   // -1 means "not found"

  if (position === -1) {
    suggestion.voters.push(myId);        // add the vote
  } else {
    suggestion.voters.splice(position, 1); // remove the vote
  }

  saveData();
  refreshBoard();   // the count changes and the list is ranked again
}

/* ---------- Deleting (event 14) ---------- */
function deleteSuggestion(id) {
  const suggestion = state.suggestions.find(item => item.id === id);
  const isOfficer = state.currentUser.role === 'Officer';
  const isOwner = suggestion && suggestion.authorId === state.currentUser.id;

  // Only the owner or an officer can delete
  if (!suggestion || (!isOwner && !isOfficer)) {
    return;
  }

  const confirmMessage = isOfficer && !isOwner
    ? `Remove "${suggestion.title}" posted by ${suggestion.author}? This cannot be undone.`
    : `Delete "${suggestion.title}"? This cannot be undone.`;

  const sure = confirm(confirmMessage);
  if (!sure) {
    return;
  }

  // Keep every suggestion EXCEPT the one with this id
  state.suggestions = state.suggestions.filter(item => item.id !== id);
  saveData();
  refreshBoard();
  showBoardMessage(isOfficer && !isOwner ? 'The suggestion was removed.' : 'The suggestion was deleted.');
}


/* ---------- Changing the status (event 15) ---------- */

// Only officers can do this
function updateStatus(id, newStatus) {
  if (state.currentUser.role !== 'Officer') {
    return;
  }
  if (!STATUSES.includes(newStatus)) {
    return;   // ignore any value that is not a real status
  }

  const suggestion = state.suggestions.find(item => item.id === id);
  if (!suggestion) {
    return;
  }

  suggestion.status = newStatus;
  saveData();
  refreshBoard();   // the badge and the officer numbers update
  showBoardMessage(`Status changed to "${newStatus}".`);
}


/*
  EVENT DELEGATION
  The cards are created by JavaScript, and they are replaced often.
  So instead of adding a listener to every button, we add ONE listener
  to the list that holds them. Clicks "bubble up" to the list, and
  event.target tells us which button was really clicked.
*/
export function handleListClick(event) {
  const button = event.target.closest('[data-action]');   // did the user click a button with data-action?
  if (!button) {
    return;
  }

  const card = button.closest('.suggestion-card');
  if (!card) {
    return;
  }

  const id = Number(card.dataset.id);   // dataset values are text, so we turn it into a number
  const action = button.dataset.action;

  switch (action) {
    case 'vote':
      toggleVote(id);
      break;
    case 'edit':
      openEditForm(id);
      break;
    case 'delete':
      deleteSuggestion(id);
      break;
    default:
      break;
  }
}

// The status dropdown fires a "change" event (not a click),
// so it needs its own listener. It is also on the list (delegation).
export function handleListChange(event) {
  const select = event.target.closest('[data-action="status"]');
  if (!select) {
    return;
  }

  const card = select.closest('.suggestion-card');
  updateStatus(Number(card.dataset.id), select.value);
}


export function sortSuggestions() {       // event 7
  saveFilterChoices();   // remember the choice (sessionStorage)
  refreshBoard();
}

export function searchSuggestions() {     // event 8
  saveFilterChoices();   // remember the choice (sessionStorage)
  refreshBoard();
}

export function filterByCategory() {      // event 9
  saveFilterChoices();   // remember the choice (sessionStorage)
  refreshBoard();
}

export function filterByStatus() {        // event 10
  saveFilterChoices();   // remember the choice (sessionStorage)
  refreshBoard();
}

export function resetFilters() {          // event 11
  clearFilterControls();
  refreshBoard();
}