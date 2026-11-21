/* =====================================================
   sync.js - LIVE SYNC BETWEEN TABS
   When you change something in one browser tab, the other
   tabs of OrgVoice update by themselves. No refresh needed.

   How it works: when localStorage is changed in one tab,
   the browser fires a "storage" event in the OTHER tabs
   (not in the tab that made the change).
   ===================================================== */

import { state, loadData, STORAGE_KEY_SUGGESTIONS } from './data.js';
import { refreshBoard, showBoardMessage } from './ui.js';
import { handleCancel } from './form.js';

// Runs when another tab changes localStorage
export async function handleStorageChange(event) {
  // Ignore changes to other keys. (event.key is null when everything was cleared.)
  if (event.key !== null && event.key !== STORAGE_KEY_SUGGESTIONS) {
    return;
  }

  await loadData();   // read the newest suggestions

  // If nobody is signed in in this tab, there is no board to update
  if (state.currentUser === null) {
    return;
  }

  // Was the suggestion we are editing deleted in the other tab?
  if (state.editingId !== null) {
    const stillThere = state.suggestions.some(item => item.id === state.editingId);

    if (!stillThere) {
      handleCancel();   // close the form
      showBoardMessage('The suggestion you were editing was deleted in another tab.', true);
      return;
    }
  }

  refreshBoard();
  showBoardMessage('The board was updated from another tab.');
}
