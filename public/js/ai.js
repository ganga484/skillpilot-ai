/* =========================================================
   SkillPilot AI — AI tools (Version 3)
   Loaded on the 4 AI tool pages, after script.js.

   What this file does:
   1. Talks to our server (/api/ai), which talks to the AI
   2. Shows which AI is connected (Live or Demo)
   3. Turns the AI's Markdown answer into safe, nice HTML
   4. Resume Generator page
   5. Job Email Generator page
   6. Chat pages: Interview Assistant and Career Q&A
   ========================================================= */

/* ---------- 1. Ask the AI (through our server) ---------- */
async function askAI(body) {
  if (window.location.protocol === "file:") {
    throw new Error(
      "The AI tools need the server. In a terminal run: node server.js, then open http://localhost:3000"
    );
  }

  let response;
  try {
    response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error("Can't reach the server. Is it still running? (node server.js)");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    // Response wasn't JSON
  }

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data.text;
}

/* ---------- 2. "Live / Demo" badge ---------- */
async function showAIStatus() {
  const badges = document.querySelectorAll("[data-ai-status]");
  if (badges.length === 0) return;

  function set(state, text) {
    badges.forEach(function (badge) {
      badge.setAttribute("data-state", state);
      badge.innerHTML = '<span class="status-dot"></span>' + escapeHTML(text);
    });
  }

  if (window.location.protocol === "file:") {
    set("off", "Server not running");
    return;
  }

  try {
    const response = await fetch("/api/status");
    const status = await response.json();
    if (status.mode === "live") set("live", "Live AI · " + status.provider);
    else set("demo", "Demo mode · sample answers");
  } catch (error) {
    set("off", "Server not running");
  }
}

/* ---------- 3. Safe Markdown → HTML ----------
   We escape everything first, so the AI can never inject
   real HTML or scripts into the page. */
function escapeHTML(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(text) {
  let html = escapeHTML(text);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\*)/g, "$1<em>$2</em>");
  html = html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
  return html;
}

function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n/g, "\n").split("\n");
  let html = "";
  let paragraph = [];
  let listType = null;

  function closeParagraph() {
    if (paragraph.length) {
      html += "<p>" + paragraph.map(formatInline).join("<br>") + "</p>";
      paragraph = [];
    }
  }
  function closeList() {
    if (listType) {
      html += "</" + listType + ">";
      listType = null;
    }
  }
  function openList(type) {
    if (listType !== type) {
      closeList();
      html += "<" + type + ">";
      listType = type;
    }
  }

  lines.forEach(function (rawLine) {
    const line = rawLine.trimEnd();
    let match;

    if (line.trim() === "" || /^```/.test(line.trim())) {
      closeParagraph();
      closeList();
    } else if ((match = line.match(/^\s*(#{1,4})\s+(.*)$/))) {
      closeParagraph();
      closeList();
      const level = match[1].length;
      html += "<h" + level + ">" + formatInline(match[2]) + "</h" + level + ">";
    } else if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      closeParagraph();
      closeList();
      html += "<hr>";
    } else if ((match = line.match(/^\s*[-*•]\s+(.*)$/))) {
      closeParagraph();
      openList("ul");
      html += "<li>" + formatInline(match[1]) + "</li>";
    } else if ((match = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
      closeParagraph();
      openList("ol");
      html += "<li>" + formatInline(match[1]) + "</li>";
    } else if ((match = line.match(/^\s*>\s?(.*)$/))) {
      closeParagraph();
      closeList();
      html += "<blockquote>" + formatInline(match[1]) + "</blockquote>";
    } else {
      closeList();
      paragraph.push(line.trim());
    }
  });

  closeParagraph();
  closeList();
  return html;
}

/* ---------- Shared helpers ---------- */

// Reads every named field of a form into a plain object.
function formToObject(form) {
  const data = {};
  new FormData(form).forEach(function (value, key) {
    data[key] = typeof value === "string" ? value.trim() : value;
  });
  return data;
}

// Checks fields marked "required". Returns true if all are filled.
function checkRequired(form) {
  let ok = true;
  form.querySelectorAll("[required]").forEach(function (input) {
    const filled = input.value.trim().length > 0;
    const group = input.closest(".form-group");
    if (group) group.classList.toggle("invalid", !filled);
    if (!filled && ok) {
      input.focus();
      ok = false;
    }
  });
  return ok;
}

// Clears the red error when the user types in a required field.
function clearErrorsOnInput(form) {
  form.querySelectorAll("[required]").forEach(function (input) {
    input.addEventListener("input", function () {
      const group = input.closest(".form-group");
      if (group && input.value.trim()) group.classList.remove("invalid");
    });
  });
}

// Copies text and briefly changes the button label to "Copied!".
async function copyText(text, button) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    // Fallback for older browsers
    const box = document.createElement("textarea");
    box.value = text;
    document.body.appendChild(box);
    box.select();
    document.execCommand("copy");
    box.remove();
  }
  if (button) {
    const original = button.innerHTML;
    button.innerHTML = icon("check") + "Copied!";
    setTimeout(function () {
      button.innerHTML = original;
    }, 1600);
  }
}

// Fills a form with example values (for trying the tool quickly).
function fillForm(form, values) {
  Object.keys(values).forEach(function (name) {
    const field = form.elements[name];
    if (!field) return;
    if (field instanceof RadioNodeList) {
      field.forEach(function (radio) {
        radio.checked = radio.value === values[name];
      });
    } else {
      field.value = values[name];
    }
    const group = field.closest ? field.closest(".form-group") : null;
    if (group) group.classList.remove("invalid");
  });
}

// Output panel states
function showLoading(output, message) {
  output.innerHTML =
    '<div class="loading" role="status">' +
      '<div class="loading-label"><span class="spinner"></span>' + escapeHTML(message) + "</div>" +
      '<div class="skeleton" style="width:55%"></div>' +
      '<div class="skeleton" style="width:90%"></div>' +
      '<div class="skeleton" style="width:80%"></div>' +
      '<div class="skeleton" style="width:85%"></div>' +
      '<div class="skeleton" style="width:40%"></div>' +
    "</div>";
}

function showError(output, message) {
  output.innerHTML =
    '<div class="error-box" role="alert">' + icon("alert") +
    "<div><strong>Couldn't get an answer</strong><p>" + escapeHTML(message) + "</p></div></div>";
}

function setBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.label = button.innerHTML;
    button.innerHTML = '<span class="spinner"></span>' + busyLabel;
    button.disabled = true;
  } else {
    button.innerHTML = button.dataset.label || button.innerHTML;
    button.disabled = false;
  }
}

/* ---------- Start everything on page load ---------- */
document.addEventListener("DOMContentLoaded", function () {
  showAIStatus();
  setupResumeTool();
  setupEmailTool();
  setupInterviewTool();
  setupCareerTool();
  setupPlannerTool();
});

/* =========================================================
   4. RESUME GENERATOR
   ========================================================= */
function setupResumeTool() {
  const form = document.getElementById("resumeForm");
  if (!form) return;

  const output = document.getElementById("resumeOutput");
  const actions = document.getElementById("resumeActions");
  const submit = form.querySelector('button[type="submit"]');
  let lastResume = "";

  clearErrorsOnInput(form);

  document.getElementById("resumeExample").addEventListener("click", function () {
    fillForm(form, {
      fullName: "Priya Sharma",
      targetRole: "Junior Data Analyst",
      email: "priya.sharma@example.com",
      phone: "+91 98765 43210",
      location: "Hyderabad, India",
      links: "linkedin.com/in/priyasharma, github.com/priyasharma",
      summary: "Final-year B.Com student who moved into data. I like finding patterns in numbers and explaining them simply.",
      experience: "Data Analyst Intern at BrightMart Retail, Jan 2026 - Jun 2026, Hyderabad. Cleaned sales data in Excel and SQL. Made a weekly Power BI dashboard for store managers. Found that weekend discounts were not increasing profit.",
      projects: "Zomato restaurant analysis: used Python and pandas on 9,000 restaurants to find which cuisines get the best ratings in each city.\nIPL dashboard: Power BI dashboard of player performance 2008-2025.",
      education: "B.Com (Computer Applications), Osmania University, 2022 - 2026, CGPA 8.2",
      skills: "SQL, Excel (pivot tables, VLOOKUP), Python (pandas, matplotlib), Power BI, communication, teamwork",
      certifications: "Google Data Analytics Certificate (2025)",
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!checkRequired(form)) return;

    const data = formToObject(form);
    setBusy(submit, true, "Writing your resume…");
    actions.hidden = true;
    showLoading(output, "The AI is writing your resume…");
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      lastResume = await askAI({ tool: "resume", data: data });
      // Shared with resumes.js so the "Save" button can store it.
      window.SkillPilotLastResume = { content: lastResume, fullName: data.fullName, targetRole: data.targetRole };
      document.dispatchEvent(new CustomEvent("resume:generated"));
      output.innerHTML = '<article class="prose resume-doc">' + renderMarkdown(lastResume) + "</article>";
      actions.hidden = false;
    } catch (error) {
      showError(output, error.message);
    } finally {
      setBusy(submit, false);
    }
  });

  document.getElementById("resumeCopy").addEventListener("click", function () {
    copyText(lastResume, this);
  });

  // "Download PDF" opens the print window; choose "Save as PDF".
  document.getElementById("resumePrint").addEventListener("click", function () {
    window.print();
  });
}

/* =========================================================
   5. JOB EMAIL GENERATOR
   ========================================================= */
function setupEmailTool() {
  const form = document.getElementById("emailForm");
  if (!form) return;

  const output = document.getElementById("emailOutput");
  const actions = document.getElementById("emailActions");
  const submit = form.querySelector('button[type="submit"]');
  let subject = "";
  let body = "";

  clearErrorsOnInput(form);

  document.getElementById("emailExample").addEventListener("click", function () {
    fillForm(form, {
      type: "follow-up",
      tone: "professional",
      yourName: "Rahul Verma",
      recipient: "Ms. Anjali Mehta",
      company: "TechNova Solutions",
      role: "Junior Web Developer",
      details: "Interviewed last Tuesday (technical round). Enjoyed discussing their React dashboard project. Want to know about next steps. I recently finished a JavaScript certification.",
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!checkRequired(form)) return;

    setBusy(submit, true, "Writing your email…");
    actions.hidden = true;
    showLoading(output, "The AI is writing your email…");
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const text = await askAI({ tool: "email", data: formToObject(form) });

      // Split the "Subject:" line from the body.
      const match = text.match(/^\s*\**subject\**\s*:\s*(.+)\n+([\s\S]*)$/i);
      subject = match ? match[1].replace(/\*+/g, "").trim() : "";
      body = (match ? match[2] : text).trim();

      output.innerHTML =
        (subject
          ? '<div class="email-subject"><span>Subject</span><strong>' + escapeHTML(subject) + "</strong></div>"
          : "") +
        '<div class="email-text">' + escapeHTML(body) + "</div>";
      actions.hidden = false;

      document.getElementById("emailOpen").href =
        "mailto:?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    } catch (error) {
      showError(output, error.message);
    } finally {
      setBusy(submit, false);
    }
  });

  document.getElementById("emailCopy").addEventListener("click", function () {
    copyText((subject ? "Subject: " + subject + "\n\n" : "") + body, this);
  });
}

/* =========================================================
   6. CHAT (used by Interview Assistant and Career Q&A)
   ========================================================= */
function createChat(options) {
  const log = document.getElementById(options.logId);
  const form = document.getElementById(options.formId);
  const input = form.querySelector("textarea");

  const chat = {
    messages: [], // the conversation: { role: "user" | "assistant", content }
    busy: false,
    finished: false,
  };

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function addBubble(role, content) {
    const row = document.createElement("div");
    row.className = "msg " + (role === "user" ? "msg-user" : "msg-ai");
    if (role === "user") {
      row.innerHTML = '<div class="bubble">' + escapeHTML(content).replace(/\n/g, "<br>") + "</div>";
    } else {
      row.innerHTML =
        '<div class="msg-avatar">' + icon(options.avatarIcon || "sparkles") + "</div>" +
        '<div class="bubble prose">' + renderMarkdown(content) + "</div>";
    }
    log.appendChild(row);
    scrollDown();
    return row;
  }

  function addTyping() {
    const row = document.createElement("div");
    row.className = "msg msg-ai typing-row";
    row.innerHTML =
      '<div class="msg-avatar">' + icon(options.avatarIcon || "sparkles") + "</div>" +
      '<div class="bubble"><span class="dots"><i></i><i></i><i></i></span></div>';
    log.appendChild(row);
    scrollDown();
    return row;
  }

  function addErrorBubble(message) {
    const row = document.createElement("div");
    row.className = "msg msg-ai";
    row.innerHTML =
      '<div class="msg-avatar is-error">' + icon("alert") + "</div>" +
      '<div class="bubble bubble-error">' + escapeHTML(message) + "</div>";
    log.appendChild(row);
    scrollDown();
  }

  function setInputEnabled(enabled) {
    form.querySelectorAll("textarea, button").forEach(function (el) {
      el.disabled = !enabled;
    });
  }

  // Sends the current conversation to the AI and shows the reply.
  async function requestReply() {
    chat.busy = true;
    setInputEnabled(false);
    const typing = addTyping();

    try {
      const reply = await askAI({
        tool: options.tool,
        setup: options.getSetup ? options.getSetup() : {},
        messages: chat.messages,
      });
      typing.remove();
      chat.messages.push({ role: "assistant", content: reply });
      addBubble("assistant", reply);
      if (options.onReply) options.onReply(reply);
      return true;
    } catch (error) {
      typing.remove();
      addErrorBubble(error.message);
      return false;
    } finally {
      chat.busy = false;
      if (!chat.finished) {
        setInputEnabled(true);
        input.focus();
      }
    }
  }

  async function send(text) {
    text = text.trim();
    if (!text || chat.busy || chat.finished) return;

    chat.messages.push({ role: "user", content: text });
    const bubble = addBubble("user", text);
    input.value = "";
    autoGrow();
    if (options.onSend) options.onSend();

    const ok = await requestReply();
    if (!ok) {
      // Put the message back so the user can try again.
      chat.messages.pop();
      bubble.remove();
      input.value = text;
      autoGrow();
    }
  }

  function autoGrow() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 180) + "px";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    send(input.value);
  });

  // Enter sends, Shift + Enter makes a new line.
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      send(input.value);
    }
  });
  input.addEventListener("input", autoGrow);

  chat.send = send;
  chat.requestReply = requestReply;
  chat.setInputEnabled = setInputEnabled;
  chat.reset = function () {
    chat.messages = [];
    chat.finished = false;
    log.querySelectorAll(".msg").forEach(function (m) {
      m.remove();
    });
  };
  return chat;
}

/* ---------- Interview Assistant ---------- */
function setupInterviewTool() {
  const setupForm = document.getElementById("interviewSetup");
  if (!setupForm) return;

  const startButton = document.getElementById("interviewStart");
  const restartButton = document.getElementById("interviewRestart");
  const welcome = document.getElementById("interviewWelcome");
  const progress = document.getElementById("interviewProgress");
  let setup = {};

  clearErrorsOnInput(setupForm);

  const chat = createChat({
    tool: "interview",
    logId: "interviewLog",
    formId: "interviewForm",
    avatarIcon: "mic",
    getSetup: function () {
      return setup;
    },
    onReply: function (reply) {
      const match = reply.match(/Question\s+(\d+)\s+of\s+(\d+)/i);
      if (match) {
        progress.textContent = "Question " + match[1] + " of " + match[2];
        progress.hidden = false;
      }
      if (/interview complete/i.test(reply)) {
        chat.finished = true;
        chat.setInputEnabled(false);
        progress.textContent = "Interview complete";
      }
    },
  });

  chat.setInputEnabled(false);

  setupForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!checkRequired(setupForm)) return;

    setup = formToObject(setupForm);
    chat.reset();
    welcome.hidden = true;
    progress.hidden = true;
    setBusy(startButton, true, "Starting…");
    setupForm.querySelectorAll("input, select").forEach(function (el) {
      el.disabled = true;
    });

    const ok = await chat.requestReply();
    setBusy(startButton, false);
    if (ok) {
      startButton.hidden = true;
      restartButton.hidden = false;
      if (window.innerWidth < 900) {
        document.getElementById("interviewLog").scrollIntoView({ behavior: "smooth" });
      }
    } else {
      setupForm.querySelectorAll("input, select").forEach(function (el) {
        el.disabled = false;
      });
      chat.setInputEnabled(false);
    }
  });

  restartButton.addEventListener("click", function () {
    chat.reset();
    chat.setInputEnabled(false);
    welcome.hidden = false;
    progress.hidden = true;
    startButton.hidden = false;
    restartButton.hidden = true;
    setupForm.querySelectorAll("input, select").forEach(function (el) {
      el.disabled = false;
    });
  });

  // "I need a hint" quick button
  document.getElementById("interviewHint").addEventListener("click", function () {
    chat.send("I'm not sure how to answer this. Can you give me a hint?");
  });
}

/* ---------- Career Q&A ---------- */
function setupCareerTool() {
  const log = document.getElementById("careerLog");
  if (!log) return;

  const welcome = document.getElementById("careerWelcome");

  const chat = createChat({
    tool: "career",
    logId: "careerLog",
    formId: "careerForm",
    avatarIcon: "sparkles",
    onSend: function () {
      welcome.hidden = true;
    },
  });

  document.querySelectorAll("[data-question]").forEach(function (chip) {
    chip.addEventListener("click", function () {
      chat.send(chip.getAttribute("data-question"));
    });
  });

  document.getElementById("careerReset").addEventListener("click", function () {
    if (chat.busy) return;
    chat.reset();
    welcome.hidden = false;
    document.querySelector("#careerForm textarea").focus();
  });
}


/* =========================================================
   7. LEARNING PLANNER
   The latest plan and your ticked weeks are kept in this
   browser, so your progress is still there when you come back.
   ========================================================= */
const PLAN_KEY = "skillpilot-plan";

function setupPlannerTool() {
  const form = document.getElementById("plannerForm");
  if (!form) return;

  const output = document.getElementById("plannerOutput");
  const actions = document.getElementById("plannerActions");
  const submit = form.querySelector('button[type="submit"]');
  let plan = null; // { text, done: [week numbers] }

  clearErrorsOnInput(form);

  function savePlan() {
    try {
      localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    } catch (error) {
      // Storage blocked — progress just won't be remembered.
    }
  }

  function updateProgress() {
    const boxes = output.querySelectorAll(".week-check input");
    const done = output.querySelectorAll(".week-check input:checked").length;
    const box = document.getElementById("plannerProgress");
    box.hidden = boxes.length === 0;
    document.getElementById("plannerProgressText").textContent = done + " of " + boxes.length + " weeks done";
    document.getElementById("plannerProgressBar").style.width = (boxes.length ? (done / boxes.length) * 100 : 0) + "%";
  }

  // Shows a plan and puts a "Done" tick-box on every "Week N" heading.
  function showPlan() {
    output.innerHTML = '<article class="prose resume-doc plan-doc">' + renderMarkdown(plan.text) + "</article>";
    output.querySelectorAll(".plan-doc h2").forEach(function (heading) {
      const match = heading.textContent.match(/^Week\s+(\d+)/i);
      if (!match) return;
      const week = Number(match[1]);
      const label = document.createElement("label");
      label.className = "week-check";
      label.innerHTML = '<input type="checkbox" aria-label="Mark week ' + week + ' as done" /><span>Done</span>';
      const box = label.querySelector("input");
      box.checked = plan.done.includes(week);
      heading.classList.toggle("is-done", box.checked);
      box.addEventListener("change", function () {
        plan.done = plan.done.filter(function (w) {
          return w !== week;
        });
        if (box.checked) plan.done.push(week);
        heading.classList.toggle("is-done", box.checked);
        savePlan();
        updateProgress();
      });
      heading.appendChild(label);
    });
    actions.hidden = false;
    updateProgress();
  }

  // Bring back the last plan, if there is one.
  try {
    const saved = JSON.parse(localStorage.getItem(PLAN_KEY) || "null");
    if (saved && typeof saved.text === "string" && Array.isArray(saved.done)) {
      plan = saved;
      showPlan();
    }
  } catch (error) {
    // Nothing saved yet.
  }

  document.getElementById("plannerExample").addEventListener("click", function () {
    fillForm(form, {
      goal: "Become a Data Analyst",
      level: "I know some basics",
      weeks: "8",
      hours: "10",
      known: "Basic Excel and a little SQL from college",
      focus: "Free resources only. Prepare for fresher job interviews.",
    });
  });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!checkRequired(form)) return;

    setBusy(submit, true, "Planning…");
    actions.hidden = true;
    document.getElementById("plannerProgress").hidden = true;
    showLoading(output, "The AI is building your learning plan…");
    output.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const text = await askAI({ tool: "planner", data: formToObject(form) });
      plan = { text: text, done: [] };
      savePlan();
      showPlan();
    } catch (error) {
      showError(output, error.message);
    } finally {
      setBusy(submit, false);
    }
  });

  document.getElementById("plannerCopy").addEventListener("click", function () {
    if (plan) copyText(plan.text, this);
  });

  document.getElementById("plannerPrint").addEventListener("click", function () {
    window.print();
  });
}
