/* =========================================================
   SkillPilot AI — Saved resumes
   1. Resume page  → "Save" button stores the resume in your account
   2. My Resumes   → lists, opens, copies and deletes saved resumes
   Uses the login saved by script.js (getSession) and talks to
   our server (/api/resumes), which talks to Supabase.
   ========================================================= */

async function resumesAPI(method, path, body) {
  const session = getSession();
  if (!session) {
    const error = new Error("Please log in first.");
    error.needsLogin = true;
    throw error;
  }

  let response;
  try {
    response = await fetch(path, {
      method: method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.accessToken },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error("Can't reach the server. Is it running? (start.bat)");
  }

  const data = await response.json().catch(function () {
    return {};
  });
  if (response.status === 401) {
    clearSession();
    const error = new Error(data.error || "Please log in again.");
    error.needsLogin = true;
    throw error;
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

document.addEventListener("DOMContentLoaded", function () {
  setupSaveResume();
  setupMyResumes();
});

/* ---------- 1. Save button (Resume page) ---------- */
function setupSaveResume() {
  const button = document.getElementById("resumeSave");
  if (!button) return;
  const status = document.getElementById("resumeSaveStatus");

  function setStatus(html) {
    status.innerHTML = html;
    status.hidden = false;
  }

  document.addEventListener("resume:generated", function () {
    button.disabled = false;
    button.innerHTML = icon("check") + "Save";
    status.hidden = true;
  });

  button.addEventListener("click", async function () {
    const resume = window.SkillPilotLastResume;
    if (!resume || !resume.content) return;

    if (!getSession()) {
      setStatus('Please <a href="login.html?next=resume.html">log in</a> to save resumes to your account.');
      return;
    }

    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span>Saving…';
    try {
      await resumesAPI("POST", "/api/resumes", {
        title: (resume.fullName || "My resume") + " — " + (resume.targetRole || "Resume"),
        targetRole: resume.targetRole,
        content: resume.content,
      });
      button.innerHTML = icon("check") + "Saved";
      setStatus('Saved to <a href="my-resumes.html">My Resumes</a>.');
    } catch (error) {
      button.disabled = false;
      button.innerHTML = icon("check") + "Save";
      setStatus(
        error.needsLogin
          ? 'Please <a href="login.html?next=resume.html">log in again</a> to save.'
          : escapeHTML(error.message)
      );
    }
  });
}

/* ---------- 2. My Resumes page ---------- */
async function setupMyResumes() {
  const list = document.getElementById("myResumes");
  if (!list) return;

  const session = getSession();
  if (!session) {
    showLoginPrompt(list);
    return;
  }

  const greeting = document.getElementById("myResumesGreeting");
  if (greeting) greeting.textContent = "Logged in as " + (session.user.name || session.user.email);

  try {
    const data = await resumesAPI("GET", "/api/resumes");
    if (!data.resumes.length) {
      list.innerHTML =
        '<div class="empty-state">' +
          '<div class="tool-icon tone-blue">' + icon("resume") + "</div>" +
          "<strong>No saved resumes yet</strong>" +
          "<p>Create one with the Resume Generator, then press Save.</p>" +
          '<a href="resume.html" class="btn btn-primary">Create a resume</a>' +
        "</div>";
      return;
    }
    list.innerHTML = "";
    data.resumes.forEach(function (resume) {
      list.appendChild(renderSavedResume(resume));
    });
  } catch (error) {
    if (error.needsLogin) {
      showLoginPrompt(list);
    } else {
      list.innerHTML = "";
      showError(list, error.message);
    }
  }
}

function showLoginPrompt(list) {
  list.innerHTML =
    '<div class="empty-state">' +
      '<div class="tool-icon tone-blue">' + icon("lock") + "</div>" +
      "<strong>Please log in to see your saved resumes</strong>" +
      "<p>Your resumes are private. Only you can see them after logging in.</p>" +
      '<a href="login.html?next=my-resumes.html" class="btn btn-primary">Log in</a>' +
    "</div>";
}

function renderSavedResume(resume) {
  const card = document.createElement("article");
  card.className = "saved-resume";

  const date = new Date(resume.created_at).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  card.innerHTML =
    '<div class="saved-head">' +
      '<div class="tool-icon tone-blue">' + icon("resume") + "</div>" +
      '<div class="saved-info">' +
        "<h3>" + escapeHTML(resume.title) + "</h3>" +
        "<small>Saved " + escapeHTML(date) + "</small>" +
      "</div>" +
      '<div class="panel-actions">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="view">' + icon("eye") + "View</button>" +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="copy">' + icon("copy") + "Copy</button>" +
        '<button type="button" class="btn btn-secondary btn-sm" data-action="delete">Delete</button>' +
      "</div>" +
    "</div>" +
    '<div class="saved-body" hidden><article class="prose resume-doc">' + renderMarkdown(resume.content) + "</article></div>";

  const body = card.querySelector(".saved-body");

  card.querySelector('[data-action="view"]').addEventListener("click", function () {
    body.hidden = !body.hidden;
    this.innerHTML = icon(body.hidden ? "eye" : "eyeOff") + (body.hidden ? "View" : "Hide");
  });

  card.querySelector('[data-action="copy"]').addEventListener("click", function () {
    copyText(resume.content, this);
  });

  // Delete asks once ("Sure?") before removing.
  const deleteButton = card.querySelector('[data-action="delete"]');
  deleteButton.addEventListener("click", async function () {
    if (!deleteButton.classList.contains("confirm")) {
      deleteButton.classList.add("confirm");
      deleteButton.textContent = "Sure? Delete";
      setTimeout(function () {
        deleteButton.classList.remove("confirm");
        deleteButton.textContent = "Delete";
      }, 3000);
      return;
    }
    deleteButton.disabled = true;
    try {
      await resumesAPI("DELETE", "/api/resumes/" + encodeURIComponent(resume.id));
      card.remove();
      if (!document.querySelector(".saved-resume")) setupMyResumes();
    } catch (error) {
      deleteButton.disabled = false;
      deleteButton.textContent = "Delete";
    }
  });

  return card;
}
