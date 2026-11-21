/* =====================================================
   auth.js - SIGN-IN AND LOG OUT
   (It is not real security. It just remembers a name and role.)
   ===================================================== */

import { state, saveUser, clearUser, clearDraft } from './data.js';
import { sanitize } from './utils.js';
import { firstNameInput, lastNameInput, nameError } from './elements.js';
import { clearFilterControls } from './filters.js';
import { showApp, showSignIn } from './ui.js';

// Runs when the user submits the sign-in form (event 2)
export function handleSignIn(event) {
  event.preventDefault();   // stops the page from reloading

  const firstName = sanitize(firstNameInput.value);
  const lastName = sanitize(lastNameInput.value);
  const role = document.querySelector('input[name="role"]:checked').value;

  // Letters-only pattern (also allows hyphens and apostrophes for names like O'Brien or Santos-Cruz)
  const lettersOnly = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-]+$/;

  // Validate first name
  if (firstName === '') {
    nameError.textContent = 'Please enter your first name.';
    firstNameInput.focus();
    return;
  }
  if (!lettersOnly.test(firstName)) {
    nameError.textContent = 'First name must contain letters only.';
    firstNameInput.focus();
    return;
  }
  if (firstName.length < 3) {
    nameError.textContent = 'First name must be at least 3 characters.';
    firstNameInput.focus();
    return;
  }
  if (firstName.length > 30) {
    nameError.textContent = 'First name must be 30 characters or less.';
    firstNameInput.focus();
    return;
  }

  // Validate last name
  if (lastName === '') {
    nameError.textContent = 'Please enter your last name.';
    lastNameInput.focus();
    return;
  }
  if (!lettersOnly.test(lastName)) {
    nameError.textContent = 'Last name must contain letters only.';
    lastNameInput.focus();
    return;
  }
  if (lastName.length < 5) {
    nameError.textContent = 'Last name must be at least 5 characters.';
    lastNameInput.focus();
    return;
  }
  if (lastName.length > 30) {
    nameError.textContent = 'Last name must be 30 characters or less.';
    lastNameInput.focus();
    return;
  }

  // Both fields are valid — combine into a full name
  const name = `${firstName} ${lastName}`;

  state.currentUser = { name, role };
  saveUser();
  nameError.textContent = '';
  clearFilterControls();   // every sign-in starts with a fresh board
  showApp();
}

// Runs when the user clicks Log Out (event 3)
export function handleLogout() {
  state.currentUser = null;
  clearUser();
  clearDraft();   // the next person should not see this person's draft
  showSignIn();
}
