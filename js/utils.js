/* =====================================================
   utils.js - HELPER FUNCTIONS
   Small tools that other files use.
   ===================================================== */

import { ONE_DAY } from './data.js';

// Removes HTML tags and extra spaces from text the user typed.
// Example: '<b>Maria</b> ' becomes 'Maria'
export function sanitize(text) {
  return text.replace(/<[^>]*>/g, '').trim();
}

// Creates an HTML element, gives it a class and text, and returns it.
// We use textContent (not innerHTML) so user text can never run as code.
export function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}

// Turns a time (number) into words like "today" or "2 days ago"
export function timeAgo(timestamp) {
  const days = Math.floor((Date.now() - timestamp) / ONE_DAY);

  if (days < 1) {
    return 'today';
  } else if (days === 1) {
    return '1 day ago';
  } else if (days < 7) {
    return `${days} days ago`;
  } else if (days < 14) {
    return '1 week ago';
  } else {
    return `${Math.floor(days / 7)} weeks ago`;
  }
}
