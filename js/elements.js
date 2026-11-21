/* =====================================================
   elements.js - PAGE ELEMENTS
   We find each element ONCE here and export it,
   so other files can import it. (Faster and shorter code.)
   ===================================================== */

// Screens
export const signinScreen = document.getElementById('signin-screen');
export const appScreen = document.getElementById('app-screen');
export const boardView = document.getElementById('board-view');
export const formView = document.getElementById('form-view');

// Sign-in form
export const signinForm = document.getElementById('signin-form');
export const firstNameInput = document.getElementById('first-name-input');
export const lastNameInput = document.getElementById('last-name-input');
export const nameError = document.getElementById('name-error');

// Header
export const userNameText = document.getElementById('user-name');
export const userRoleBadge = document.getElementById('user-role');
export const logoutButton = document.getElementById('logout-button');

// Board
export const boardTitle = document.getElementById('board-title');
export const suggestionList = document.getElementById('suggestion-list');
export const topThreeList = document.getElementById('top-three-list');
export const officerOnlyItems = document.querySelectorAll('.officer-only'); // a list of all officer-only parts

// Toolbar (search, filters, sort)
export const searchInput = document.getElementById('search-input');
export const categoryFilter = document.getElementById('category-filter');
export const statusFilter = document.getElementById('status-filter');
export const sortSelect = document.getElementById('sort-select');
export const clearFiltersButton = document.getElementById('clear-filters-button');

// Board message and New Suggestion button
export const boardMessage = document.getElementById('board-message');
export const newSuggestionButton = document.getElementById('new-suggestion-button');
export const newSuggestionCard = document.getElementById('new-suggestion-card');

// Suggestion form
export const suggestionForm = document.getElementById('suggestion-form');
export const formTitle = document.getElementById('form-title');
export const titleInput = document.getElementById('title-input');
export const titleCounter = document.getElementById('title-counter');
export const categoryInput = document.getElementById('category-input');
export const descriptionInput = document.getElementById('description-input');
export const descriptionCounter = document.getElementById('description-counter');
export const draftNotice = document.getElementById('draft-notice');
export const formMessage = document.getElementById('form-message');
export const cancelButton = document.getElementById('cancel-button');
export const submitButton = document.getElementById('submit-button');

// Numbers on the page
export const statTotal = document.getElementById('stat-total');
export const statPending = document.getElementById('stat-pending');
export const statReview = document.getElementById('stat-review');
export const statDone = document.getElementById('stat-done');
export const mySuggestionCount = document.getElementById('my-suggestion-count');
export const myVoteCount = document.getElementById('my-vote-count');
