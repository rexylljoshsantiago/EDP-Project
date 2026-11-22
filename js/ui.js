/* =====================================================
   ui.js - THE PRESENTATION LAYER
   Everything that changes what the user SEES:
   showing/hiding screens and building the suggestion cards.
   ===================================================== */

import { state, STATUSES } from './data.js';
import { makeElement, timeAgo } from './utils.js';
import { getVisibleSuggestions, clearFilterControls, compareByVotes } from './filters.js';
import {
  signinScreen, appScreen, boardView, formView,
  signinForm, nameError,
  registerForm, registerError, signinPanel, registerPanel, tabSignin, tabRegister,
  userNameText, userRoleBadge,
  boardTitle, boardMessage, suggestionList, officerOnlyItems, topThreeList,
  statTotal, statPending, statReview, statDone,
  mySuggestionCount, myVoteCount, newSuggestionCard
} from './elements.js';


/* ---------- Showing and hiding screens ----------
   We add or remove the "hidden" class (see style.css). */

export function showSignIn() {
  signinForm.reset();            // clears the name box
  clearFilterControls();         // clears search, filters, and sort
  nameError.textContent = '';    // clears old error messages
  registerForm.reset();          // clears the register form
  registerError.textContent = '';
  signinPanel.classList.remove('hidden');     // always open on the Sign In tab
  registerPanel.classList.add('hidden');
  tabSignin.classList.add('auth-tab-active');
  tabRegister.classList.remove('auth-tab-active');
  signinScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
}

export function showApp() {
  signinScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  boardMessage.classList.add('hidden');
  updateHeader();
  applyRoleView();
  showBoard();
  refreshBoard();
  showLoadErrorIfNeeded();
}

export function showBoard() {
  boardView.classList.remove('hidden');
  formView.classList.add('hidden');
}

export function showForm() {
  boardView.classList.add('hidden');
  formView.classList.remove('hidden');
}

// If the sample data could not be loaded (and there is nothing to show), tell the user
export function showLoadErrorIfNeeded() {
  if (state.loadError && state.suggestions.length === 0) {
    showBoardMessage('The sample suggestions could not be loaded. You can still post your own.', true);
  }
}

// Shows a message on the board.
// A normal (green) message hides itself after 4 seconds.
// An error (red) message stays until something else replaces it.
let messageTimer = null;
export function showBoardMessage(text, isError = false) {
  boardMessage.textContent = text;
  boardMessage.classList.toggle('error', isError);
  boardMessage.classList.remove('hidden');

  clearTimeout(messageTimer);   // cancel an older timer, if there is one

  if (!isError) {
    messageTimer = setTimeout(() => {
      boardMessage.classList.add('hidden');
    }, 4000);
  }
}

// Shows the user's name and role in the header
function updateHeader() {
  userNameText.textContent = `Signed in as ${state.currentUser.name}`;
  userRoleBadge.textContent = state.currentUser.role;
}

// Shows or hides the parts that are only for officers
function applyRoleView() {
  const isOfficer = state.currentUser.role === 'Officer';

  officerOnlyItems.forEach(item => {
    item.classList.toggle('hidden', !isOfficer);   // hide when NOT an officer
  });

  boardTitle.textContent = isOfficer ? 'Officer Dashboard' : 'Suggestions';

  // Officers review suggestions — they do not post them
  newSuggestionCard.classList.toggle('hidden', isOfficer);
}


/* ---------- Showing the suggestion cards ---------- */

// Updates everything on the board. We call this after any change.
export function refreshBoard() {
  renderSuggestions(getVisibleSuggestions());   // only the suggestions that match the search and filters
  updateOfficerStats();
  updateTopThree();
  updateActivity();
}

// Builds the cards for the list we give it and puts them on the page
function renderSuggestions(list) {
  suggestionList.textContent = '';   // remove the old cards

  if (list.length === 0) {
    // Two different messages: nothing exists yet, or nothing matches the filters
    let text;
    if (state.loading) {
      text = 'Loading suggestions...';                       // still waiting for the data
    } else if (state.suggestions.length === 0) {
      text = 'No suggestions yet. Click "+ New Suggestion" to post the first idea.';
    } else {
      text = 'No suggestions match your search or filters.';
    }
    suggestionList.appendChild(makeElement('p', 'empty-message', text));
    return;
  }

  // A DocumentFragment holds all the cards off-screen,
  // so the page only updates once (faster).
  const fragment = document.createDocumentFragment();
  list.forEach(suggestion => {
    fragment.appendChild(createSuggestionCard(suggestion));
  });
  suggestionList.appendChild(fragment);
}

// Builds ONE card for ONE suggestion
function createSuggestionCard(suggestion) {
  // Destructuring: take the values out of the object
  const { id, title, description, category, status, author, authorId, createdAt, voters } = suggestion;

  const hasVoted = voters.includes(state.currentUser.id);
  const isOwner = authorId === state.currentUser.id;

  // The card itself. data-id remembers which suggestion this card is.
  const card = makeElement('div', 'suggestion-card');
  card.dataset.id = id;

  // Upvote button (left side)
  const voteBox = makeElement('button', 'vote-box');
  voteBox.type = 'button';
  voteBox.dataset.action = 'vote';
  voteBox.title = hasVoted ? 'Remove your upvote' : 'Upvote this suggestion';
  voteBox.setAttribute('aria-pressed', String(hasVoted));   // helps screen readers
  if (hasVoted) {
    voteBox.classList.add('voted');
  }
  voteBox.append(
    makeElement('span', 'vote-arrow', '\u25B2'),
    makeElement('span', 'vote-count', String(voters.length)),
    makeElement('span', 'vote-label', voters.length === 1 ? 'vote' : 'votes')
  );

  // Tags row: category, status, and who posted it
  const statusBadge = makeElement('span', 'badge', status);
  if (status !== 'Pending') {
    statusBadge.classList.add('badge-dark');
  }
  const authorName = isOwner ? 'you' : author;
  const tags = makeElement('div', 'card-tags');
  tags.append(
    makeElement('span', 'badge', category),
    statusBadge,
    makeElement('span', 'card-meta', `by ${authorName} - ${timeAgo(createdAt)}`)
  );

  // Footer holds the tags, and a box of action buttons on the right
  const footer = makeElement('div', 'card-footer');
  footer.appendChild(tags);

  const actions = makeElement('div', 'card-actions');

  // Officers get a dropdown to change the status and a Remove button
  if (state.currentUser.role === 'Officer') {
    actions.appendChild(createStatusControl(title, status));

    const removeButton = makeElement('button', 'button button-small button-danger', 'Remove');
    removeButton.type = 'button';
    removeButton.dataset.action = 'delete';
    actions.appendChild(removeButton);
  }

  // The owner of the suggestion gets Edit and Delete buttons (Members only)
  if (isOwner && state.currentUser.role !== 'Officer') {
    const editButton = makeElement('button', 'button button-small', 'Edit');
    editButton.type = 'button';
    editButton.dataset.action = 'edit';

    const deleteButton = makeElement('button', 'button button-small', 'Delete');
    deleteButton.type = 'button';
    deleteButton.dataset.action = 'delete';

    actions.append(editButton, deleteButton);
  }

  // Only add the box if it has something inside
  if (actions.children.length > 0) {
    footer.appendChild(actions);
  }

  // Right side: title, description, and footer
  const content = makeElement('div', 'card-content');
  content.append(
    makeElement('h3', '', title),
    makeElement('p', 'card-description', description),
    footer
  );

  card.append(voteBox, content);
  return card;
}

// Builds the "Status: [dropdown]" box that officers see on each card
function createStatusControl(title, currentStatus) {
  const wrapper = makeElement('div', 'status-control');
  wrapper.appendChild(makeElement('span', '', 'Status:'));

  const select = makeElement('select');
  select.dataset.action = 'status';
  select.setAttribute('aria-label', `Change the status of ${title}`);

  STATUSES.forEach(name => {
    const option = makeElement('option', '', name);
    option.value = name;
    select.appendChild(option);
  });
  select.value = currentStatus;   // select the current status

  wrapper.appendChild(select);
  return wrapper;
}

// Updates the numbers in the officer summary boxes
function updateOfficerStats() {
  const list = state.suggestions;
  statTotal.textContent = list.length;
  statPending.textContent = list.filter(item => item.status === 'Pending').length;
  statReview.textContent = list.filter(item => item.status === 'Under Review').length;
  statDone.textContent = list.filter(item => item.status === 'Approved' || item.status === 'Implemented').length;
}

// Fills the "Top 3 by votes" list in the officer sidebar
function updateTopThree() {
  const topThree = [...state.suggestions].sort(compareByVotes).slice(0, 3);

  topThreeList.textContent = '';

  if (topThree.length === 0) {
    topThreeList.appendChild(makeElement('li', '', 'No suggestions yet.'));
    return;
  }

  topThree.forEach(item => {
    topThreeList.appendChild(makeElement('li', '', `${item.title} (${item.voters.length})`));
  });
}

// Updates "Suggestions posted" and "Upvotes given"
function updateActivity() {
  const myId = state.currentUser.id;
  mySuggestionCount.textContent = state.suggestions.filter(item => item.authorId === myId).length;
  myVoteCount.textContent = state.suggestions.filter(item => item.voters.includes(myId)).length;
}