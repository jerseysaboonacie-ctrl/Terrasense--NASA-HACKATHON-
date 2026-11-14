// display.js: high contrast, large text and reduced motion, on every page.
//
// A classic (non-module) script loaded in each page's <head>, so the saved
// look is applied before the page is drawn (no flash). It reads the same
// saved settings as the Player (prefs.js) and binds any checkboxes with
// data-display="highContrast|largeText|reduceMotion" on the page.

(function () {
  var KEY = 'terrasense-jukebox-prefs-v1';
  var NAMES = { highContrast: 'hc', largeText: 'large-text', reduceMotion: 'reduce-motion' };

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function write(key, value) {
    var p = read();
    p[key] = value;
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) { /* not saved: fine */ }
  }
  function apply(p) {
    var root = document.documentElement;
    Object.keys(NAMES).forEach(function (k) { root.classList.toggle(NAMES[k], p[k] === true); });
  }

  apply(read());
  window.TerraDisplay = { apply: apply, read: read };

  // Pages other than the Player: bind the display checkboxes, if any.
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.dataset.ownPrefs) return; // the Player binds its own (player.js)
    var p = read();
    document.querySelectorAll('input[data-display]').forEach(function (box) {
      var k = box.dataset.display;
      box.checked = p[k] === true;
      box.addEventListener('change', function () { write(k, box.checked); apply(read()); });
    });
  });
})();
