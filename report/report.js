/* Víbrur Games — playtest report page behaviour
   ================================================================
   The form POSTs straight to a form backend (FormSubmit) which
   emails the answers + any attached log file to dromi@dromi.is.
   This script only adds quality-of-life: answers autosave to this
   browser as the tester types (so they don't lose work), a live
   answered-counter, a file-size guard, and a clear button.
   ================================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "bt-playtest-report-v1";
  var MAX_BYTES = 10 * 1024 * 1024; // FormSubmit free tier: 10 MB total

  var form = document.getElementById("report-form");
  var countEl = document.getElementById("answer-count");
  var btnClear = document.getElementById("btn-clear");
  var fileInput = document.getElementById("q-attach");
  var attachHint = document.getElementById("attach-hint");
  var sendStatus = document.getElementById("send-status");

  if (!form) return;

  /* ---- collect / restore (text + radio only) ---------------- */

  function savableFields() {
    return form.querySelectorAll("input[type=text], textarea, input[type=radio]");
  }

  function snapshot() {
    var data = {};
    savableFields().forEach(function (f) {
      if (f.name.charAt(0) === "_") return; // skip FormSubmit control fields
      if (f.type === "radio") {
        if (f.checked) data[f.name] = f.value;
      } else if (f.value.trim() !== "") {
        data[f.name] = f.value;
      }
    });
    return data;
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot())); }
    catch (e) { /* private mode / quota — autosave off, form still works */ }
  }

  function restore() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { return; }
    if (!raw) return;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return; }
    Object.keys(data).forEach(function (name) {
      var fields = form.querySelectorAll('[name="' + name + '"]');
      if (!fields.length) return;
      if (fields[0].type === "radio") {
        fields.forEach(function (r) { r.checked = (r.value === data[name]); });
      } else {
        fields[0].value = data[name];
      }
    });
  }

  /* ---- answered counter ------------------------------------- */

  function updateCount() {
    if (!countEl) return;
    var total = 0, answered = 0;
    document.querySelectorAll("main section[data-sec]").forEach(function (sec) {
      sec.querySelectorAll(".q").forEach(function (q) {
        total++;
        var checked = q.querySelector("input[type=radio]:checked");
        var field = q.querySelector("input[type=text], textarea");
        if (checked || (field && field.value.trim() !== "")) answered++;
      });
    });
    countEl.textContent = "answered " + answered + " of " + total +
      " — every one helps, only your name is required";
  }

  /* ---- file-size guard -------------------------------------- */

  function totalFileBytes() {
    if (!fileInput || !fileInput.files) return 0;
    var sum = 0;
    for (var i = 0; i < fileInput.files.length; i++) sum += fileInput.files[i].size;
    return sum;
  }

  function fmtMB(bytes) { return (bytes / 1024 / 1024).toFixed(1) + " MB"; }

  function checkFiles() {
    if (!attachHint) return true;
    var bytes = totalFileBytes();
    if (bytes > MAX_BYTES) {
      attachHint.textContent = "that's " + fmtMB(bytes) +
        " — over the 10 MB limit. attach just the newest BetterTogether.log, " +
        "or email the big file to dromi@dromi.is. (your answers will still send.)";
      attachHint.classList.add("attach-over");
      return false;
    }
    attachHint.classList.remove("attach-over");
    attachHint.textContent = bytes > 0
      ? "attached " + fmtMB(bytes) + " — good to go."
      : "up to 10 MB total. bigger than that? email it to dromi@dromi.is instead — the rest still sends.";
    return true;
  }

  /* ---- wiring ----------------------------------------------- */

  form.addEventListener("input", function () { save(); updateCount(); });
  form.addEventListener("change", function () { save(); updateCount(); });

  if (fileInput) fileInput.addEventListener("change", checkFiles);

  form.addEventListener("submit", function (e) {
    // Native validation (the required name field) runs before this fires.
    if (!checkFiles()) {
      e.preventDefault();
      if (sendStatus) {
        sendStatus.textContent = "please shrink or remove the attachment first (or email it separately) — then hit send again.";
        sendStatus.classList.add("attach-over");
      }
      if (fileInput) fileInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // let it submit natively to FormSubmit; keep answers in storage as a
    // safety net in case the network hiccups (cleared via the clear button).
    if (sendStatus) sendStatus.textContent = "sending…";
  });

  if (btnClear) {
    btnClear.addEventListener("click", function () {
      if (!window.confirm("Clear all your answers? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      form.reset();
      updateCount();
      checkFiles();
    });
  }

  /* ---- init ------------------------------------------------- */

  restore();
  updateCount();
})();
