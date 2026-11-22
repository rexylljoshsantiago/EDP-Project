// Where the sample suggestions are kept (a JSON file we load with fetch)
const SAMPLE_DATA_URL = 'data/suggestions.json';

// The four statuses a suggestion can have (officers can change them)
export const STATUSES = ['Pending', 'Under Review', 'Approved', 'Implemented'];

// Milliseconds in one day. We use it to work out "2 days ago".
export const ONE_DAY = 24 * 60 * 60 * 1000;

// Names used as keys in the browser storage (like labels on boxes)
export const STORAGE_KEY_SUGGESTIONS = 'orgvoice_suggestions';   // localStorage
export const STORAGE_KEY_USER = 'orgvoice_user';                 // localStorage
export const STORAGE_KEY_ACCOUNTS = 'orgvoice_accounts';         // localStorage
export const STORAGE_KEY_DRAFT = 'orgvoice_draft';               // sessionStorage
export const STORAGE_KEY_FILTERS = 'orgvoice_filters';           // sessionStorage

/* =====================================================
   THE APP STATE
   One object holds everything the app needs to remember.
   (We use an object because a "const" variable cannot be reassigned,
   but it CAN change the properties of an object. That is why we use an object.)

    state.suggestions = the list (array) of all suggestions
    state.currentUser = the signed-in user: { id: '24-1509-790', name: '...', role: '...' }
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
    author: 'Maria Santos',       (display name only)
    authorId: '24-1509-790',      (student ID: used to check ownership)
    createdAt: 1700000000000,   (the time it was posted)
    voters: ['23-1000-100', '23-1037-111']   (student IDs of people who upvoted)
  }
  The number of votes is just voters.length.
  Saving the student IDs (not only a number) lets us allow one vote per person.
*/

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
      authorId: item.authorId,
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

// Older saved data used NAMES for ownership and votes. This turns them into
// student IDs (using the registered accounts) so old posts keep working.
function migrateSuggestions(list) {
  const accounts = loadAccounts();
  const toId = name => {
    const acc = accounts.find(a => `${a.firstName} ${a.lastName}`.toLowerCase() === String(name).toLowerCase());
    return acc && acc.studentId ? acc.studentId : `legacy:${name}`;
  };
  let changed = false;
  list.forEach(item => {
    if (!item.authorId) {
      item.authorId = toId(item.author);
      changed = true;
    }
    item.voters = (item.voters || []).map(v => {
      if (/^\d{2}-\d{4}-\d{3}$/.test(v) || String(v).startsWith('legacy:')) return v;
      changed = true;
      return toId(v);
    });
  });
  if (changed) {
    try { localStorage.setItem(STORAGE_KEY_SUGGESTIONS, JSON.stringify(list)); } catch (e) { /* ignore */ }
  }
  return list;
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
      state.suggestions = migrateSuggestions(savedList);
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
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(state.currentUser));
  } catch (error) {
    console.error('Could not save the user:', error);
  }
}

// Removes the saved user (used when logging out)
export function clearUser() {
  localStorage.removeItem(STORAGE_KEY_USER);
}

// Loads the signed-in user (if there is one)
export function loadUser() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY_USER);

    if (savedText === null) {
      state.currentUser = null;
      return;
    }

    const savedUser = JSON.parse(savedText);
    const roleIsValid = savedUser.role === 'Member' || savedUser.role === 'Officer';

    if (savedUser.id && savedUser.name && roleIsValid) {
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


/* =====================================================
   REGISTERED ACCOUNTS (localStorage)
   Each account: { studentId, firstName, lastName, password, role }
   The full name (firstName + ' ' + lastName) is used
   as the display name and author across the app.
   ===================================================== */

export function saveAccounts(accounts) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (error) {
    console.error('Could not save accounts:', error);
  }
}

export function loadAccounts() {
  try {
    const savedText = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (savedText === null) return [];
    const accounts = JSON.parse(savedText);
    return Array.isArray(accounts) ? accounts : [];
  } catch (error) {
    console.error('Could not load accounts:', error);
    return [];
  }
}