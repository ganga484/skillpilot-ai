/* =========================================================
   SkillPilot AI — Main JavaScript (Version 2)
   Loaded in the <head> of every page.

   What this file does:
   1.  Applies the saved dark/light theme before the page draws
   2.  Builds the navigation bar (same on every page)
   3.  Builds the footer (same on every page)
   4.  Turns <span data-icon="..."></span> into real icons
   5.  Dark/light mode button
   6.  Mobile menu
   7.  Navbar shadow on scroll
   8.  Fade-in animations on scroll
   9.  Tool filters (AI Tools page)
   10. "Coming soon" popup (AI Tools page)
   11. Form checking (Contact, Login, Register)
   12. Show/hide password + password strength meter
   ========================================================= */

/* ---------- 1. Apply saved theme immediately ---------- */
(function applySavedTheme() {
  let theme = null;
  try {
    theme = localStorage.getItem("skillpilot-theme");
  } catch (error) {
    // Storage may be blocked — that's okay.
  }
  if (!theme) {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    theme = prefersDark ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", theme);
})();

/* ---------- Site settings: change these in ONE place ---------- */
const SITE = {
  name: "SkillPilot",
  tagline: "Your AI-powered career and learning companion.",
  email: "hello@skillpilot.ai",
  navLinks: [
    { href: "index.html", label: "Home" },
    { href: "about.html", label: "About" },
    { href: "tools.html", label: "AI Tools" },
    { href: "contact.html", label: "Contact" },
  ],
};

/* ---------- Icon library (simple line icons) ----------
   Each value is the inside of a 24×24 SVG. Use in HTML like:
   <span data-icon="mail"></span> */
const ICONS = {
  logo: '<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  arrow: '<path d="M5 12h14M12 5l7 7-7 7"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  resume: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  book: '<path d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2z"/><path d="M22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7z"/>',
  bot: '<rect x="3" y="8" width="18" height="12" rx="3"/><path d="M12 8V5"/><circle cx="12" cy="4" r="1"/><path d="M9 13v2M15 13v2"/>',
  sparkles: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 3v4M17 5h4"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  trending: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  wand: '<path d="m15 4-1 3M19 8l-3 1M18 4l-2 2M3 21l12-12M14 7l3 3"/>',
  lightbulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
};

/* The AI tool pages count as the "AI Tools" section in the menu. */
const PAGE_SECTIONS = {
  "resume.html": "tools.html",
  "interview.html": "tools.html",
  "email.html": "tools.html",
  "assistant.html": "tools.html",
  "planner.html": "tools.html",
};

/* Returns the full <svg> code for an icon name. */
function icon(name) {
  const inner = ICONS[name] || "";
  return (
    '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    inner +
    "</svg>"
  );
}

/* Which page are we on? e.g. "about.html" */
function currentPage() {
  const page = window.location.pathname.split("/").pop();
  return page === "" ? "index.html" : page;
}

/* Everything below runs once the HTML has loaded. */
document.addEventListener("DOMContentLoaded", function () {
  renderHeader();
  renderFooter();
  renderIcons();
  setupThemeToggle();
  setupMobileMenu();
  setupNavbarShadow();
  setupScrollReveal();
  setupToolFilter();
  setupToolModal();
  setupLogout();
  setupForms();
  setupPasswordToggles();
  setupPasswordStrength();
});

/* ---------- 2. Navigation bar ---------- */
function renderHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;

  const page = currentPage();
  const section = PAGE_SECTIONS[page] || page;

  const links = SITE.navLinks
    .map(function (link) {
      const active = link.href === section ? ' class="active" aria-current="page"' : "";
      return '<li><a href="' + link.href + '"' + active + ">" + link.label + "</a></li>";
    })
    .join("");

  header.innerHTML =
    '<nav class="container nav-inner" aria-label="Main">' +
      '<a href="index.html" class="logo" aria-label="' + SITE.name + ' AI home">' +
        '<span class="logo-mark">' + icon("logo") + "</span>" +
        "<span>" + SITE.name + ' <span class="logo-ai">AI</span></span>' +
      "</a>" +
      '<div class="nav-menu" id="navMenu">' +
        '<ul class="nav-links">' + links + "</ul>" +
        '<div class="nav-auth">' + authButtons(page) + "</div>" +
      "</div>" +
      '<div class="nav-actions">' +
        '<button class="icon-btn theme-toggle" id="themeToggle" type="button" aria-label="Toggle dark mode">' +
          '<span class="icon-sun">' + icon("sun") + "</span>" +
          '<span class="icon-moon">' + icon("moon") + "</span>" +
        "</button>" +
        '<button class="icon-btn menu-toggle" id="menuToggle" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="navMenu">' +
          icon("menu") +
        "</button>" +
      "</div>" +
    "</nav>";
}

/* ---------- Logged-in user (saved in this browser) ---------- */
const SESSION_KEY = "skillpilot-session";

function getSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (session && session.user && session.expiresAt > Date.now()) return session;
    if (session) localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Storage blocked or broken — treat as logged out.
  }
  return null;
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    // Ignore — the user just won't stay logged in.
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Ignore.
  }
}

function escapeHTML(text) {
  return String(text).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function authButtons(page) {
  const session = getSession();
  if (session) {
    const first = escapeHTML(String(session.user.name || "Friend").split(" ")[0]);
    return (
      '<span class="nav-user">Hi, ' + first + "</span>" +
      '<a href="my-resumes.html" class="btn btn-ghost' + (page === "my-resumes.html" ? " is-current" : "") + '">My Resumes</a>' +
      '<button type="button" class="btn btn-ghost" id="logoutBtn">Log out</button>'
    );
  }
  return (
    '<a href="login.html" class="btn btn-ghost' + (page === "login.html" ? " is-current" : "") + '">Log in</a>' +
    '<a href="register.html" class="btn btn-primary">Get started</a>'
  );
}

function setupLogout() {
  const button = document.getElementById("logoutBtn");
  if (!button) return;
  button.addEventListener("click", function () {
    clearSession();
    window.location.href = "index.html";
  });
}

/* ---------- 3. Footer ---------- */
function renderFooter() {
  const footer = document.getElementById("site-footer");
  if (!footer) return;

  const year = new Date().getFullYear();

  footer.innerHTML =
    '<div class="container">' +
      '<div class="footer-grid">' +
        '<div class="footer-brand">' +
          '<a href="index.html" class="logo">' +
            '<span class="logo-mark">' + icon("logo") + "</span>" +
            "<span>" + SITE.name + ' <span class="logo-ai">AI</span></span>' +
          "</a>" +
          "<p>" + SITE.tagline + "</p>" +
        "</div>" +
        "<div><h4>Product</h4><ul>" +
          '<li><a href="resume.html">Resume Generator</a></li>' +
          '<li><a href="interview.html">Interview Assistant</a></li>' +
          '<li><a href="email.html">Job Email Generator</a></li>' +
          '<li><a href="assistant.html">AI Career Q&amp;A</a></li>' +
          '<li><a href="planner.html">Learning Planner</a></li>' +
        "</ul></div>" +
        "<div><h4>Company</h4><ul>" +
          '<li><a href="about.html">About</a></li>' +
          '<li><a href="contact.html">Contact</a></li>' +
        "</ul></div>" +
        "<div><h4>Account</h4><ul>" +
          '<li><a href="login.html">Log in</a></li>' +
          '<li><a href="register.html">Create account</a></li>' +
        "</ul></div>" +
      "</div>" +
      '<div class="footer-bottom">' +
        "<span>© " + year + " " + SITE.name + " AI. All rights reserved.</span>" +
        '<a href="mailto:' + SITE.email + '">' + SITE.email + "</a>" +
      "</div>" +
    "</div>";
}

/* ---------- 4. Icons ---------- */
function renderIcons() {
  document.querySelectorAll("[data-icon]").forEach(function (el) {
    el.innerHTML = icon(el.getAttribute("data-icon"));
  });
}

/* ---------- 5. Dark / light mode ---------- */
function setupThemeToggle() {
  const button = document.getElementById("themeToggle");
  if (!button) return;

  button.addEventListener("click", function () {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const next = isDark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("skillpilot-theme", next);
    } catch (error) {
      // Ignore if storage is unavailable.
    }
  });
}

/* ---------- 6. Mobile menu ---------- */
function setupMobileMenu() {
  const button = document.getElementById("menuToggle");
  const menu = document.getElementById("navMenu");
  if (!button || !menu) return;

  function setOpen(open) {
    menu.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
    button.setAttribute("aria-expanded", open);
    button.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    button.innerHTML = icon(open ? "close" : "menu");
  }

  button.addEventListener("click", function () {
    setOpen(!menu.classList.contains("open"));
  });

  menu.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });

  // Close the menu if the screen becomes wide again.
  window.addEventListener("resize", function () {
    if (window.innerWidth > 900) setOpen(false);
  });
}

/* ---------- 7. Navbar shadow on scroll ---------- */
function setupNavbarShadow() {
  const header = document.getElementById("site-header");
  if (!header) return;

  function update() {
    header.classList.toggle("scrolled", window.scrollY > 8);
  }
  update();
  window.addEventListener("scroll", update, { passive: true });
}

/* ---------- 8. Fade-in on scroll ---------- */
function setupScrollReveal() {
  const items = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window)) {
    items.forEach(function (el) {
      el.classList.add("visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  items.forEach(function (el) {
    observer.observe(el);
  });
}

/* ---------- 9. Tool filters ---------- */
function setupToolFilter() {
  const buttons = document.querySelectorAll(".filter-btn");
  const cards = document.querySelectorAll("[data-category]");
  if (buttons.length === 0) return;

  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (b) {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");

      const filter = button.getAttribute("data-filter");
      cards.forEach(function (card) {
        const show = filter === "all" || card.getAttribute("data-category") === filter;
        card.classList.toggle("hidden", !show);
      });
    });
  });
}

/* ---------- 10. "Coming soon" popup ---------- */
function setupToolModal() {
  const modal = document.getElementById("toolModal");
  if (!modal) return;

  const modalIcon = document.getElementById("modalIcon");
  const modalTitle = document.getElementById("modalTitle");
  const closeButtons = modal.querySelectorAll("[data-close]");

  document.querySelectorAll(".open-tool").forEach(function (button) {
    button.addEventListener("click", function () {
      modalIcon.innerHTML = icon(button.getAttribute("data-tool-icon"));
      modalIcon.style.setProperty("--tone", button.getAttribute("data-tone"));
      modalTitle.textContent = button.getAttribute("data-tool");
      modal.classList.add("open");
    });
  });

  function close() {
    modal.classList.remove("open");
  }

  closeButtons.forEach(function (b) {
    b.addEventListener("click", close);
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) close();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") close();
  });
}

/* ---------- 11. Form checking ----------
   Each input has data-rule="..." saying how to check it.
   Each form has data-form="contact" / "login" / "register". */
const RULES = {
  name: function (value) {
    return value.trim().length >= 2;
  },
  email: function (value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  },
  message: function (value) {
    return value.trim().length >= 10;
  },
  password: function (value) {
    return value.length >= 8;
  },
  required: function (value) {
    return value.length > 0;
  },
};

/* Messages shown in preview mode (when Supabase is not set up in .env).
   With Supabase set up, forms are sent to the server instead — see submitForm(). */
const SUCCESS_MESSAGES = {
  contact: function (form) {
    return "Thanks, " + form.querySelector("#name").value.trim() +
      "! Your message looks good. (Demo: sending will work once the backend is connected.)";
  },
  login: function () {
    return "Details look good! (Demo: real sign-in will work once the backend is connected.)";
  },
  register: function (form) {
    return "Welcome aboard, " + form.querySelector("#fullName").value.trim().split(" ")[0] +
      "! (Demo: your account will be saved once the backend is connected.)";
  },
};

function checkInput(input, form) {
  const rule = input.getAttribute("data-rule");
  let valid;

  if (rule === "match") {
    const other = form.querySelector("#" + input.getAttribute("data-match"));
    valid = input.value.length > 0 && input.value === other.value;
  } else if (rule === "checked") {
    valid = input.checked;
  } else {
    valid = RULES[rule](input.value);
  }

  const group = input.closest(".form-group");
  if (group) group.classList.toggle("invalid", !valid);
  return valid;
}

function setupForms() {
  document.querySelectorAll("form[data-form]").forEach(function (form) {
    const inputs = form.querySelectorAll("[data-rule]");
    const success = form.querySelector(".form-success");

    // Remove the red error as soon as the user fixes a field.
    inputs.forEach(function (input) {
      const eventName = input.type === "checkbox" ? "change" : "input";
      input.addEventListener(eventName, function () {
        const group = input.closest(".form-group");
        if (group && group.classList.contains("invalid")) checkInput(input, form);
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault(); // stop the page from reloading

      let allValid = true;
      inputs.forEach(function (input) {
        if (!checkInput(input, form)) allValid = false;
      });

      if (!allValid) {
        success.classList.remove("show");
        const firstError = form.querySelector(".invalid input, .invalid textarea");
        if (firstError) firstError.focus();
        return;
      }

      submitForm(form, success);
    });
  });

  // When real accounts are switched on, hide the "preview version" notes.
  if (document.querySelector("form[data-form]")) {
    getServerConfig().then(function (config) {
      if (!config.accounts) return;
      document.querySelectorAll(".demo-note").forEach(function (note) {
        note.hidden = true;
      });
    });
  }
}

/* Asks the server whether Supabase accounts are switched on. */
let serverConfigPromise = null;
function getServerConfig() {
  if (!serverConfigPromise) {
    serverConfigPromise = fetch("/api/config")
      .then(function (response) {
        return response.ok ? response.json() : { accounts: false };
      })
      .catch(function () {
        return { accounts: false };
      });
  }
  return serverConfigPromise;
}

function showFormMessage(box, text, isError) {
  box.textContent = text;
  box.classList.toggle("is-error", !!isError);
  box.classList.add("show");
}

async function submitForm(form, box) {
  const type = form.getAttribute("data-form");
  const config = await getServerConfig();

  // No database yet: keep the old preview behaviour.
  if (!config.accounts) {
    showFormMessage(box, SUCCESS_MESSAGES[type](form), false);
    form.reset();
    resetStrengthMeter();
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  const buttonHTML = button.innerHTML;
  button.disabled = true;
  button.textContent = type === "contact" ? "Sending…" : type === "login" ? "Logging in…" : "Creating account…";
  box.classList.remove("show");

  const value = function (selector) {
    const input = form.querySelector(selector);
    return input ? input.value : "";
  };

  let endpoint;
  let payload;
  if (type === "login") {
    endpoint = "/api/auth/login";
    payload = { email: value("#loginEmail"), password: value("#loginPassword") };
  } else if (type === "register") {
    endpoint = "/api/auth/register";
    payload = { name: value("#fullName"), email: value("#regEmail"), password: value("#regPassword") };
  } else {
    endpoint = "/api/contact";
    payload = { name: value("#name"), email: value("#email"), topic: value("#topic"), message: value("#message") };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");

    if (data.status === "signed_in") {
      saveSession(data.session);
      showFormMessage(box, "Welcome, " + String(data.session.user.name).split(" ")[0] + "! Taking you to your tools…", false);
      // Go back to the page that asked for login (e.g. ?next=my-resumes.html)
      const next = new URLSearchParams(window.location.search).get("next");
      setTimeout(function () {
        window.location.href = next && /^[a-z-]+\.html$/.test(next) ? next : "tools.html";
      }, 900);
      return;
    }
    if (data.status === "confirm_email") {
      showFormMessage(box, data.message, false);
    } else {
      showFormMessage(box, "Thanks, " + payload.name.trim().split(" ")[0] + "! Your message was sent. We'll reply by email.", false);
    }
    form.reset();
    resetStrengthMeter();
  } catch (error) {
    const offline = error instanceof TypeError;
    showFormMessage(box, offline ? "Can't reach the server. Is it running? (start.bat)" : error.message, true);
  } finally {
    button.disabled = false;
    button.innerHTML = buttonHTML;
  }
}

/* ---------- 12. Show / hide password ---------- */
function setupPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach(function (button) {
    const input = document.getElementById(button.getAttribute("data-target"));

    button.addEventListener("click", function () {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      button.innerHTML = icon(show ? "eyeOff" : "eye");
      button.setAttribute("aria-label", show ? "Hide password" : "Show password");
    });
  });
}

/* ---------- Password strength meter (Register page) ---------- */
function setupPasswordStrength() {
  const input = document.getElementById("regPassword");
  const meter = document.getElementById("strengthMeter");
  if (!input || !meter) return;

  const label = document.getElementById("strengthLabel");
  const names = ["Too short", "Weak", "Fair", "Good", "Strong"];

  input.addEventListener("input", function () {
    const value = input.value;
    let score = 0;

    if (value.length >= 8) {
      score = 1;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
      if (/[0-9]/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;
    }

    meter.setAttribute("data-score", value.length === 0 ? "" : score);
    label.textContent = value.length === 0 ? "Use 8+ characters with a mix of letters, numbers & symbols" : names[score];
  });
}

function resetStrengthMeter() {
  const meter = document.getElementById("strengthMeter");
  const label = document.getElementById("strengthLabel");
  if (meter) meter.setAttribute("data-score", "");
  if (label) label.textContent = "Use 8+ characters with a mix of letters, numbers & symbols";
}
