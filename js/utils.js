/* =====================================================
   utils.js - HELPER FUNCTIONS
   Small tools that other files use.
   ===================================================== */

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

// Turns a timestamp into a readable date like "Nov 14, 2026"
export function timeAgo(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
