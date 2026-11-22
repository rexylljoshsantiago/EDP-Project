import { state, saveData, saveDraft, loadDraft, clearDraft } from './data.js';
import { sanitize } from './utils.js';
import {
  suggestionForm, formTitle, titleInput, titleCounter,
  categoryInput, descriptionInput, descriptionCounter,
  formMessage, draftNotice, submitButton
} from './elements.js';
import { showBoard, showForm, refreshBoard, showBoardMessage } from './ui.js';
import { clearFilterControls } from './filters.js';

// The rules for the form. If a rule changes, we change it here only.
const TITLE_MIN = 5;
const TITLE_MAX = 80;
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 500;


/* ---------- Opening and closing the form ---------- */

// Clears every field and message
function resetForm() {
  suggestionForm.reset();
  formMessage.textContent = '';
  draftNotice.classList.add('hidden');
  state.editingId = null;   // we are not editing anything
  updateCharCounter();
}

// Runs when the user clicks "+ New Suggestion"
export function openNewForm() {
  // Officers are not allowed to post suggestions
  if (state.currentUser.role === 'Officer') {
    return;
  }

  resetForm();
  formTitle.textContent = 'Submit a Suggestion';
  submitButton.textContent = 'Submit Suggestion';

  // Was there an unfinished draft (for example, before a refresh)? Put it back.
  const draft = loadDraft();
  if (draft !== null) {
    titleInput.value = draft.title;
    categoryInput.value = draft.category;
    descriptionInput.value = draft.description;
    updateCharCounter();
    draftNotice.classList.remove('hidden');
  }

  showForm();
  titleInput.focus();   // the cursor is ready in the title box
}

export function openEditForm(id) {
  const suggestion = state.suggestions.find(item => item.id === id);

  // Safety check: only the owner can edit
  if (!suggestion || suggestion.authorId !== state.currentUser.id) {
    return;
  }

  resetForm();
  state.editingId = id;   // remember which suggestion we are editing

  // Put the saved values into the form
  titleInput.value = suggestion.title;
  categoryInput.value = suggestion.category;
  descriptionInput.value = suggestion.description;
  updateCharCounter();

  formTitle.textContent = 'Edit Suggestion';
  submitButton.textContent = 'Save Changes';
  showForm();
  titleInput.focus();
}

export function handleCancel() {
  clearDraft();   
  resetForm();
  showBoard();
}


/* ---------- Saving a draft while the user types (sessionStorage) ---------- */

// Runs when the user types in the title or description, or picks a category
export function saveDraftFromForm() {
  // We only save drafts of NEW suggestions, not edits
  if (state.editingId !== null) {
    return;
  }

  const draft = {
    title: titleInput.value,
    category: categoryInput.value,
    description: descriptionInput.value
  };

  if (draft.title === '' && draft.category === '' && draft.description === '') {
    clearDraft();   // the form is empty, so there is nothing to keep
  } else {
    saveDraft(draft);
  }
}


/* ---------- Live character counters (event 4) ---------- */

// Runs every time the user types in the title or description
export function updateCharCounter() {
  const titleLength = titleInput.value.length;
  const descriptionLength = descriptionInput.value.length;

  titleCounter.textContent = titleLength;
  descriptionCounter.textContent = descriptionLength;

  // The counter turns red when the text is too long
  titleCounter.closest('.counter').classList.toggle('over-limit', titleLength > TITLE_MAX);
  descriptionCounter.closest('.counter').classList.toggle('over-limit', descriptionLength > DESCRIPTION_MAX);

  // If an error is showing, check again as the user types.
  // The message goes away once everything is valid.
  if (formMessage.textContent !== '') {
    formMessage.textContent = validateSuggestion(
      sanitize(titleInput.value),
      categoryInput.value,
      sanitize(descriptionInput.value)
    );
  }
}


/* ---------- Validation (event 5, part 1) ---------- */

// Checks the three fields.
// Returns an error message (text), or '' (empty text) if everything is OK.
function validateSuggestion(title, category, description) {
  if (title === '') {
    return 'Please enter a title.';
  }
  if (title.length < TITLE_MIN) {
    return `The title must be at least ${TITLE_MIN} characters.`;
  }
  if (title.length > TITLE_MAX) {
    return `The title must be ${TITLE_MAX} characters or less.`;
  }

  // Is there already a suggestion with the same title?
  // (When editing, we skip the suggestion we are editing, so it does not match itself.)
  const isDuplicate = state.suggestions.some(item =>
    item.id !== state.editingId && item.title.toLowerCase() === title.toLowerCase()
  );
  if (isDuplicate) {
    return 'A suggestion with this title already exists. Please use a different title or upvote the existing one.';
  }

  if (category === '') {
    return 'Please select a category.';
  }

  if (description === '') {
    return 'Please enter a description.';
  }
  if (description.length < DESCRIPTION_MIN) {
    return `The description must be at least ${DESCRIPTION_MIN} characters.`;
  }
  if (description.length > DESCRIPTION_MAX) {
    return `The description must be ${DESCRIPTION_MAX} characters or less.`;
  }

  return '';   // no problems found
}


/* ---------- Saving a new suggestion (event 5, part 2) ---------- */

// Creates the new suggestion object and saves it
function addSuggestion(title, category, description) {
  // New id = the biggest id now + 1
  const biggestId = Math.max(0, ...state.suggestions.map(item => item.id));

  const newSuggestion = {
    id: biggestId + 1,
    title,
    description,
    category,
    status: 'Pending',               // every new suggestion starts as Pending
    author: state.currentUser.name,
    authorId: state.currentUser.id,
    createdAt: Date.now(),
    voters: []                       // nobody has voted yet
  };

  state.suggestions.push(newSuggestion);
  saveData();
}

/* ---------- Saving an edited suggestion (event 13) ---------- */

// Changes the title, category, and description.
// The votes, status, author, and date stay the same.
function updateSuggestion(id, title, category, description) {
  const suggestion = state.suggestions.find(item => item.id === id);

  if (!suggestion || suggestion.authorId !== state.currentUser.id) {
    return;
  }

  suggestion.title = title;
  suggestion.category = category;
  suggestion.description = description;
  saveData();
}


// Runs when the user submits the form (new suggestion OR edited suggestion)
export function handleFormSubmit(event) {
  event.preventDefault();   // stops the page from reloading

  // Officers cannot post suggestions
  if (state.currentUser.role === 'Officer') {
    return;
  }

  // Clean the text first (removes HTML tags and extra spaces)
  const title = sanitize(titleInput.value);
  const category = categoryInput.value;
  const description = sanitize(descriptionInput.value);

  const errorMessage = validateSuggestion(title, category, description);

  if (errorMessage !== '') {
    formMessage.textContent = errorMessage;   // show the error and stay on the form
    return;
  }

  let successText;

  if (state.editingId !== null) {
    // We are editing an old suggestion
    updateSuggestion(state.editingId, title, category, description);
    successText = 'Your suggestion was updated.';
  } else {
    // We are posting a new suggestion
    addSuggestion(title, category, description);
    successText = 'Your suggestion was posted successfully.';
  }

  clearDraft();   // the suggestion was saved, so the draft is not needed
  resetForm();
  showBoard();
  clearFilterControls();   // so the suggestion is not hidden by an old filter
  refreshBoard();
  showBoardMessage(successText);
}