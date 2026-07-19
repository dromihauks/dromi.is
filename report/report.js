/* Víbrur Games — playtest report page behaviour
   ================================================================
   Everything is local: answers autosave to this browser's
   localStorage as the tester types, and the buttons turn the
   answers into a downloadable .txt / clipboard text. Nothing is
   ever sent anywhere from this page.
   ================================================================ */

(function () {
  "use strict";

  var STORAGE_KEY = "bt-playtest-report-v1";

  var form = document.getElementById("report-form");
  var countEl = document.getElementById("answer-count");
  var statusEl = document.getElementById("action-status");
  var btnDownload = document.getElementById("btn-download");
  var btnCopy = document.getElementById("btn-copy");
  var btnEmail = document.getElementById("btn-email");
  var btnClear = document.getElementById("btn-clear");

  if (!form) return;

  /* ---- collect / restore ------------------------------------ */

  function allFields() {
    return form.querySelectorAll("input[type=text], textarea, input[type=radio]");
  }

  function snapshot() {
    var data = {};
    allFields().forEach(function (f) {
      if (f.type === "radio") {
        if (f.checked) data[f.name] = f.value;
      } else if (f.value.trim() !== "") {
        data[f.name] = f.value;
      }
    });
    return data;
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot()));
    } catch (e) { /* private mode / quota — autosave off, page still works */ }
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

  /* ---- question walk (for the report text + the counter) ---- */

  function questionBlocks() {
    var out = [];
    document.querySelectorAll("main section[data-sec]").forEach(function (sec) {
      var secTitle = sec.getAttribute("data-sec");
      sec.querySelectorAll(".q").forEach(function (q) {
        var label = q.getAttribute("data-label");
        if (!label) {
          var lab = q.querySelector(".q-label");
          label = lab ? lab.textContent.replace(/\s+/g, " ").trim() : "(question)";
        }
        var value = "";
        var checked = q.querySelector("input[type=radio]:checked");
        if (checked) {
          value = checked.value;
        } else {
          var field = q.querySelector("input[type=text], textarea");
          if (field) value = field.value.trim();
        }
        out.push({ section: secTitle, label: label, value: value });
      });
    });
    return out;
  }

  function updateCount() {
    if (!countEl) return;
    var qs = questionBlocks();
    var answered = qs.filter(function (q) { return q.value !== ""; }).length;
    countEl.textContent = "answered " + answered + " of " + qs.length + " — every one helps, none are required";
  }

  /* ---- report text ------------------------------------------ */

  function playerName() {
    var f = document.getElementById("q-name");
    return f && f.value.trim() ? f.value.trim() : "";
  }

  function buildText() {
    var lines = [];
    var name = playerName();
    lines.push("BETTER TOGETHER — PLAYTEST REPORT");
    lines.push("Player: " + (name || "(no name given)"));
    lines.push("Generated: " + new Date().toString());
    lines.push("================================================");
    var current = null;
    questionBlocks().forEach(function (q) {
      if (q.section !== current) {
        current = q.section;
        lines.push("");
        lines.push("## " + current.toUpperCase());
        lines.push("");
      }
      lines.push("Q: " + q.label);
      lines.push("A: " + (q.value !== "" ? q.value : "—"));
      lines.push("");
    });
    return lines.join("\n");
  }

  function slug(s) {
    return s.replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "player";
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg;
  }

  /* ---- actions ---------------------------------------------- */

  form.addEventListener("submit", function (e) { e.preventDefault(); });
  form.addEventListener("input", function () { save(); updateCount(); });
  form.addEventListener("change", function () { save(); updateCount(); });

  if (btnDownload) {
    btnDownload.addEventListener("click", function () {
      var name = playerName();
      if (!name) {
        setStatus("please fill in your name first (section 01) — I need it to match your logs");
        var f = document.getElementById("q-name");
        if (f) f.focus();
        return;
      }
      var blob = new Blob([buildText()], { type: "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "BetterTogether_report_" + slug(name) + ".txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      setStatus("downloaded — look in your Downloads folder, then do step 2");
    });
  }

  if (btnCopy) {
    btnCopy.addEventListener("click", function () {
      var text = buildText();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          setStatus("copied — paste it into the email body, then do step 2");
        }, function () {
          setStatus("couldn't copy automatically — use the download button instead");
        });
      } else {
        setStatus("couldn't copy automatically — use the download button instead");
      }
    });
  }

  if (btnEmail) {
    btnEmail.addEventListener("click", function () {
      var name = playerName();
      var subject = "Better Together playtest — " + (name || "report");
      var body = "Hi Dromi,\n\nMy playtest report and Saved.zip are attached.\n\n" + (name ? "— " + name : "");
      btnEmail.href = "mailto:dromi@dromi.is?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      /* the default mailto: href still works if JS never ran */
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", function () {
      if (!window.confirm("Clear all your answers? This cannot be undone.")) return;
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      form.reset();
      updateCount();
      setStatus("cleared");
    });
  }

  /* ---- init ------------------------------------------------- */

  restore();
  updateCount();
})();
