/* =====================================================
   data.js - THE DATA LAYER
   This file holds our data and saves/loads it.
   It does not touch the page (no HTML here).

   We use TWO kinds of browser storage:
   - localStorage   = stays until it is cleared. We use it for the
                      suggestions, because they must never be lost.
                      (All tabs share it.)
   - sessionStorage = lives only for ONE tab. We use it for temporary
                      things: who is signed in, an unfinished draft,
                      and the search/filter choices.
   ===================================================== */

// Names used as keys in the browser storage (like labels on boxes)
export const STORAGE_KEY_SUGGESTIONS = 'orgvoice_suggestions';   // localStorage
export const STORAGE_KEY_USER = 'orgvoice_user';                 // sessionStorage
export const STORAGE_KEY_DRAFT = 'orgvoice_draft';               // sessionStorage
export const STORAGE_KEY_FILTERS = 'orgvoice_filters';           // sessionStorage

// Where the sample suggestions are kept (a JSON file we load with fetch)
const SAMPLE_DATA_URL = 'data/suggestions.json';

// The four statuses a suggestion can have (officers can change them)
export const STATUSES = ['Pending', 'Under Review', 'Approved', 'Implemented'];

// Milliseconds in one day. We use it to work out "2 days ago".
export const ONE_DAY = 24 * 60 * 60 * 1000;

/*
  The "state" is where we keep the data that changes while the app runs.
  We put it in ONE object so every file can share it.
  (A file cannot reassign a variable that was imported from another file,
   but it CAN change the properties of an object. That is why we use an object.)

    state.suggestions = the list (array) of all suggestions
    state.currentUser = the signed-in user: { name: '...', role: '...' }
    state.editingId   = the id of the suggestion being edited (null when posting a new one)
    state.loading     = true while the data is still loading
    state.loadError   = true if the sample data could not be loaded
*/
export const state = {
  suggestions: [],
  currentUser: null,
  editingId: null,
  loading: true,
  loadError: false
};

/*
  Each suggestion is an object that looks like this:
  {
    id: 1,
    title: 'Some title',
    description: 'Some description',
    category: 'Events',
    status: 'Pending',
    author: 'Maria Santos',
    createdAt: 1700000000000,   (the time it was posted)
    voters: ['Ana Reyes', 'Joel Cruz']   (names of people who upvoted)
  }
  The number of votes is just voters.length.
  Saving the names (not only a number) lets us allow one vote per person.
*/


/* =====================================================
   LOADING THE SAMPLE DATA FROM A JSON FILE (fetch)
   The first time the app opens, there is nothing saved yet.
   So we read the starter suggestions from data/suggestions.json.

   "async" means this function can wait for slow things.
   "await" means: wait here until the answer arrives.
   fetch() gives us a Promise (a promise to answer later).
   ===================================================== */

// Returns the list of sample suggestions, or null if something went wrong
async function loadSampleData() {
  try {
    const response = await fetch(SAMPLE_DATA_URL);   // ask for the file

    // A missing file (404) does NOT cause an error by itself,
    // so we must check response.ok ourselves.
    if (!response.ok) {
      throw new Error(`The file could not be loaded (status ${response.status}).`);
    }

    const list = await response.json();   // turn the JSON text into an array

    if (!Array.isArray(list)) {
      throw new Error('The sample file is not a list.');
    }

    // The file says "daysAgo". We turn it into a real time (createdAt).
    return list.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      author: item.author,
      createdAt: Date.now() - item.daysAgo * ONE_DAY,
      voters: item.voters
    }));
  } catch (error) {
    console.error('Could not load the sample data:', error);
    return null;
  }
}

// Uses the sample data as the starting suggestions
async function useSampleData() {
  const sample = await loadSampleData();

  if (sample === null) {
    // It failed. We start with an empty list and tell the user.
    // We do NOT save, so the next visit can try again.
    state.suggestions = [];
    state.loadError = true;
    return;
  }

  state.suggestions = sample;
  state.loadError = false;
  saveData();
}


/* =====================================================
   SAVING AND LOADING THE SUGGESTIONS (localStorage)
   Storage can only keep text, so we use:
   - JSON.stringify() to turn our data into text (saving)
   - JSON.parse() to turn the text back into data (loading)
   ===================================================== */

// Saves all suggestions
export function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(state.suggestions));
  } catch (error) {
    console.error('Could not save the suggestions:', error);
  }
}

// Loads the suggestions. If nothing is saved (or the data is broken),
// it loads the sample data instead so the app never crashes.
export async function loadData() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY_SUGGESTIONS);

    if (savedText === null) {
      await useSampleData();   // first time opening the app
      return;
    }

    const savedList = JSON.parse(savedText);

    if (Array.isArray(savedList)) {
      state.suggestions = savedList;
    } else {
      throw new Error('Saved suggestions are not a list.');
    }
  } catch (error) {
    console.error('Could not load the suggestions. Using sample data.', error);
    await useSampleData();
  }
}


/* =====================================================
   THE SIGNED-IN USER (sessionStorage)
   sessionStorage belongs to ONE tab. So each tab has its own
   signed-in user. This lets you open one tab as a Member and
   another tab as an Officer at the same time.
   ===================================================== */

export function saveUser() {
  try {
    sessionStorage.setItem(STORAGE_KEY_USER, JSON.stringify(state.currentUser));
  } catch (error) {
    console.error('Could not save the user:', error);
  }
}

// Removes the saved user (used when logging out)
export function clearUser() {
  sessionStorage.removeItem(STORAGE_KEY_USER);
}

// Loads the signed-in user (if there is one)
export function loadUser() {
  try {
    const savedText = sessionStorage.getItem(STORAGE_KEY_USER);

    if (savedText === null) {
      state.currentUser = null;
      return;
    }

    const savedUser = JSON.parse(savedText);
    const roleIsValid = savedUser.role === 'Member' || savedUser.role === 'Officer';

    if (savedUser.name && roleIsValid) {
      state.currentUser = savedUser;
    } else {
      state.currentUser = null;
    }
  } catch (error) {
    console.error('Could not load the user.', error);
    state.currentUser = null;
  }
}


/* =====================================================
   THE UNFINISHED DRAFT (sessionStorage)
   While someone types a new suggestion, we save what they typed.
   If the page is refreshed by accident, the draft comes back.
   A draft looks like: { title: '...', category: '...', description: '...' }
   ===================================================== */

export function saveDraft(draft) {
  try {
    sessionStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  } catch (error) {
    console.error('Could not save the draft:', error);
  }
}

// Returns the saved draft, or null if there is none
export function loadDraft() {
  try {
    const savedText = sessionStorage.getItem(STORAGE_KEY_DRAFT);
    if (savedText === null) {
      return null;
    }

    const draft = JSON.parse(savedText);
    const isValid =
      typeof draft.title === 'string' &&
      typeof draft.category === 'string' &&
      typeof draft.description === 'string';

    return isValid ? draft : null;
  } catch (error) {
    return null;
  }
}

export function clearDraft() {
  sessionStorage.removeItem(STORAGE_KEY_DRAFT);
}


/* =====================================================
   THE SEARCH AND FILTER CHOICES (sessionStorage)
   So a refresh does not lose what the user was looking at.
   Choices look like: { search: '', category: '', status: '', sort: 'votes' }
   ===================================================== */

export function saveFilters(choices) {
  try {
    sessionStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(choices));
  } catch (error) {
    console.error('Could not save the filter choices:', error);
  }
}

// Returns the saved choices, or null if there are none
export function loadFilters() {
  try {
    const savedText = sessionStorage.getItem(STORAGE_KEY_FILTERS);
    if (savedText === null) {
      return null;
    }

    const choices = JSON.parse(savedText);
    const isValid =
      typeof choices.search === 'string' &&
      typeof choices.category === 'string' &&
      typeof choices.status === 'string' &&
      typeof choices.sort === 'string';

    return isValid ? choices : null;
  } catch (error) {
    return null;
  }
}

export function clearSavedFilters() {
  sessionStorage.removeItem(STORAGE_KEY_FILTERS);
}
