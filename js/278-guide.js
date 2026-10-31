"use strict";
// One introduction per page load; restarting a run skips it. No persistent storage.
let guideSeen = false;
function requestRampage() {
  const dialog = document.getElementById("guide");
  if (!guideSeen && dialog && typeof dialog.showModal === "function") {
    guideSeen = true; resetInput(); dialog.showModal();
    const button = document.getElementById("guide-start");
    button.onclick = () => { dialog.close(); audioInit(); startGame(); };
    dialog.oncancel = () => { resetInput(); };
    button.focus({ preventScroll: true });
    return;
  }
  startGame();
}
