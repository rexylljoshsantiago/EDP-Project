/* =====================================================
   auth.js - SIGN-IN, REGISTER, AND LOG OUT
   Accounts are stored in localStorage.
   Each account: { studentId, firstName, lastName, password, role }
   The student ID (like 24-1509-790) is unique and is used to sign in.
   ===================================================== */

import { state, saveUser, clearUser, clearDraft, loadAccounts, saveAccounts } from './data.js';
import { sanitize } from './utils.js';
import {
  studentIdInput, passwordInput, nameError,
  tabSignin, tabRegister, signinPanel, registerPanel,
  registerForm, regStudentId, regFirstName, regLastName, regPassword, regConfirmPassword, registerError
} from './elements.js';
import { clearFilterControls } from './filters.js';
import { showApp, showSignIn } from './ui.js';


/* ---------- Tab switching ---------- */

export function handleTabSignin() {
  signinPanel.classList.remove('hidden');
  registerPanel.classList.add('hidden');
  tabSignin.classList.add('auth-tab-active');
  tabRegister.classList.remove('auth-tab-active');
  nameError.textContent = '';
}

export function handleTabRegister() {
  registerPanel.classList.remove('hidden');
  signinPanel.classList.add('hidden');
  tabRegister.classList.add('auth-tab-active');
  tabSignin.classList.remove('auth-tab-active');
  registerError.textContent = '';
}


/* ---------- Student ID helpers ---------- */

// Format: 2 digits - 4 digits - 3 digits (example: 24-1509-790)
const studentIdPattern = /^\d{2}-\d{4}-\d{3}$/;

// Adds the dashes while the user types digits: 241509790 -> 24-1509-790
export function formatStudentIdInput(event) {
  const digits = event.target.value.replace(/\D/g, '').slice(0, 9);
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 9)];
  event.target.value = parts.filter(part => part !== '').join('-');
}

function validateStudentId(id) {
  if (id === '') return 'Please enter your student ID.';
  if (!studentIdPattern.test(id)) return 'Student ID must look like 24-1509-790.';
  return '';
}


/* ---------- Validation helper ---------- */

// Letters only (also allows hyphens and apostrophes)
const lettersOnly = /^[a-zA-ZÀ-ÖØ-öø-ÿ'\-]+$/;

function validateName(firstName, lastName) {
  if (firstName === '') return 'Please enter your first name.';
  if (!lettersOnly.test(firstName)) return 'First name must contain letters only.';
  if (firstName.length < 2) return 'First name must be at least 2 characters.';
  if (firstName.length > 30) return 'First name must be 30 characters or less.';

  if (lastName === '') return 'Please enter your last name.';
  if (!lettersOnly.test(lastName)) return 'Last name must contain letters only.';
  if (lastName.length < 2) return 'Last name must be at least 2 characters.';
  if (lastName.length > 30) return 'Last name must be 30 characters or less.';

  return '';
}


/* ---------- Sign In ---------- */

export function handleSignIn(event) {
  event.preventDefault();

  const studentId = studentIdInput.value.trim();
  const password  = passwordInput.value;

  const idErr = validateStudentId(studentId);
  if (idErr !== '') {
    nameError.textContent = idErr;
    studentIdInput.focus();
    return;
  }

  if (password === '') {
    nameError.textContent = 'Please enter your password.';
    passwordInput.focus();
    return;
  }

  // Find the account with this student ID
  const account = loadAccounts().find(acc => acc.studentId === studentId);

  if (!account) {
    nameError.textContent = 'No account found with that student ID. Please register first.';
    return;
  }

  if (account.password !== password) {
    nameError.textContent = 'Incorrect password. Please try again.';
    passwordInput.focus();
    return;
  }

  // Credentials match - sign in
  state.currentUser = { id: account.studentId, name: `${account.firstName} ${account.lastName}`, role: account.role };
  saveUser();
  nameError.textContent = '';
  clearFilterControls();
  showApp();
}


/* ---------- Register ---------- */

export function handleRegister(event) {
  event.preventDefault();

  const studentId = regStudentId.value.trim();
  const firstName = sanitize(regFirstName.value);
  const lastName  = sanitize(regLastName.value);
  const password  = regPassword.value;
  const confirm   = regConfirmPassword.value;
  const role      = document.querySelector('input[name="reg-role"]:checked').value;

  // Validate student ID
  const idErr = validateStudentId(studentId);
  if (idErr !== '') {
    registerError.textContent = idErr;
    regStudentId.focus();
    return;
  }

  // Validate name fields
  const nameErr = validateName(firstName, lastName);
  if (nameErr !== '') {
    registerError.textContent = nameErr;
    return;
  }

  // Validate password
  if (password === '') {
    registerError.textContent = 'Please enter a password.';
    regPassword.focus();
    return;
  }
  if (password.length < 6) {
    registerError.textContent = 'Password must be at least 6 characters.';
    regPassword.focus();
    return;
  }
  if (password !== confirm) {
    registerError.textContent = 'Passwords do not match.';
    regConfirmPassword.focus();
    return;
  }

  // Check if the student ID is already registered (two people CAN share a name)
  const accounts = loadAccounts();
  if (accounts.some(acc => acc.studentId === studentId)) {
    registerError.textContent = 'An account with that student ID already exists.';
    regStudentId.focus();
    return;
  }

  // Save the new account
  accounts.push({ studentId, firstName, lastName, password, role });
  saveAccounts(accounts);

  // Sign the new user in immediately
  state.currentUser = { id: studentId, name: `${firstName} ${lastName}`, role };
  saveUser();
  registerError.textContent = '';
  clearFilterControls();
  showApp();
}


/* ---------- Log Out ---------- */

export function handleLogout() {
  state.currentUser = null;
  clearUser();
  clearDraft();
  showSignIn();
}