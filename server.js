/* =========================================================
   SkillPilot AI — Server
   ---------------------------------------------------------
   What this file does:
   1. Shows your website (everything in the "public" folder)
   2. Receives requests from the AI tools on your website
   3. Sends them to an AI provider (Gemini, Claude or OpenAI)
      using YOUR secret API key, which never reaches the browser
   4. Sends the AI's answer back to the website

   It uses only features built into Node.js (version 18 or newer),
   so there is nothing to install.

   Start it with:   node server.js
   Then open:       http://localhost:3000
   ========================================================= */

const http = require("http");
const fs = require("fs");
const path = require("path");

/* ---------- 1. Load settings from the .env file ----------
   The .env file holds your secret API key. It stays on your
   computer and is never sent to the browser. */
loadEnvFile(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

/* ---------- 2. AI providers ----------
   Pick one in .env with AI_PROVIDER=gemini | claude | openai | demo */
const PROVIDERS = {
  gemini: {
    label: "Google Gemini",
    keyName: "GEMINI_API_KEY",
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    call: callGemini,
  },
  claude: {
    label: "Anthropic Claude",
    keyName: "ANTHROPIC_API_KEY",
    model: process.env.CLAUDE_MODEL || "claude-haiku-4-5-20251001",
    call: callClaude,
  },
  openai: {
    label: "OpenAI",
    keyName: "OPENAI_API_KEY",
    model: process.env.OPENAI_MODEL || "gpt-6-luna",
    call: callOpenAI,
  },
};

const chosen = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
const provider = PROVIDERS[chosen] || null;
const apiKey = provider ? (process.env[provider.keyName] || "").trim() : "";

// Demo mode = no real AI. Used when AI_PROVIDER=demo or the key is missing.
const DEMO_MODE = !provider || !apiKey || apiKey.startsWith("your-");

/* ---------- Supabase (accounts + database) ----------
   Put SUPABASE_URL and SUPABASE_ANON_KEY in .env to turn on real
   sign-up, log-in and saving contact messages. Without them the
   forms keep working in "preview" mode. */
const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const SUPABASE_KEY = (process.env.SUPABASE_ANON_KEY || "").trim();
const SUPABASE_ON =
  /^https:\/\/.+/.test(SUPABASE_URL) && SUPABASE_KEY.length > 20 && !SUPABASE_KEY.startsWith("your-");

/* ---------- 3. Simple protection against overuse ----------
   Each visitor (IP address) can make RATE_LIMIT requests every
   10 minutes. This protects your API bill. */
const RATE_LIMIT = Number(process.env.RATE_LIMIT) || 30;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const requestLog = new Map();

/* The visitor's address. Online (Render etc.) every request comes through
   the host's proxy, so we read the real visitor from its headers.
   Set TRUST_PROXY=1 on the host to turn this on. */
function clientIp(req) {
  if (process.env.TRUST_PROXY === "1") {
    const direct = req.headers["cf-connecting-ip"] || req.headers["true-client-ip"];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.trim()) return forwarded.split(",")[0].trim();
  }
  return req.socket.remoteAddress || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// Clean up old entries every 10 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [ip, times] of requestLog) {
    if (times.every((t) => now - t >= RATE_WINDOW_MS)) requestLog.delete(ip);
  }
}, RATE_WINDOW_MS).unref();

/* =========================================================
   4. THE AI TOOLS
   Each tool has instructions for the AI (the "system prompt")
   and a function that turns the form data into a message.
   Edit the prompts here to change how the AI behaves.
   ========================================================= */

const TOOLS = {
  /* ----- Resume Generator ----- */
  resume: {
    maxTokens: 4000,
    system: () =>
      [
        "You are an expert resume writer who helps students, freshers and career switchers.",
        "Write a complete, professional, ATS-friendly resume in Markdown from the details the user gives.",
        "",
        "Rules:",
        "- Use ONLY facts the user provided. Never invent employers, job titles, dates, degrees, grades or numbers.",
        "- Where a number would make a bullet stronger but none was given, add a placeholder like [X%] or [number] for the user to fill in.",
        "- Rewrite the user's notes into strong, concise bullet points that start with action verbs.",
        "- Tailor the summary and skills order to the target role.",
        "- Skip any section the user gave no information for.",
        "",
        "Use exactly this structure:",
        "# Full Name",
        "Contact line (email | phone | location | links), separated by ' | '",
        "## Professional Summary  (2–3 sentences)",
        "## Skills  (grouped, e.g. **Technical:** ..., **Tools:** ..., **Soft skills:** ...)",
        "## Experience  (### Job Title — Company, then an italic line with dates/location, then 3–5 bullets)",
        "## Projects  (### Project name, then 2–3 bullets)",
        "## Education",
        "## Certifications",
        "",
        "Output only the resume. No introduction, no closing remarks, no code fences.",
      ].join("\n"),
    buildMessages: (data) => {
      const d = {
        fullName: clean(data.fullName, 80),
        targetRole: clean(data.targetRole, 120),
        email: clean(data.email, 120),
        phone: clean(data.phone, 40),
        location: clean(data.location, 80),
        links: clean(data.links, 300),
        summary: clean(data.summary, 1500),
        experience: clean(data.experience, 4000),
        projects: clean(data.projects, 2500),
        education: clean(data.education, 1500),
        skills: clean(data.skills, 1000),
        certifications: clean(data.certifications, 800),
      };
      if (!d.fullName || !d.targetRole) {
        throw new UserError("Please enter your full name and target role.");
      }
      if (!d.experience && !d.education && !d.skills && !d.projects) {
        throw new UserError("Please add at least your education, skills, experience or projects.");
      }
      const lines = [
        "Create my resume from these details.",
        "",
        field("Full name", d.fullName),
        field("Target role", d.targetRole),
        field("Email", d.email),
        field("Phone", d.phone),
        field("Location", d.location),
        field("Links (LinkedIn, GitHub, portfolio)", d.links),
        field("About me / summary notes", d.summary),
        field("Work experience / internships", d.experience),
        field("Projects", d.projects),
        field("Education", d.education),
        field("Skills", d.skills),
        field("Certifications / achievements", d.certifications),
      ];
      return [{ role: "user", content: lines.filter(Boolean).join("\n") }];
    },
  },

  /* ----- Job Email Generator ----- */
  email: {
    maxTokens: 1500,
    system: () =>
      [
        "You write short, effective job-search emails for students, freshers and job seekers.",
        "",
        "Rules:",
        "- The very first line must be: Subject: <subject line>",
        "- Then one blank line, then the email body, ending with a sign-off and the sender's name.",
        "- Plain text only. No Markdown, no asterisks, no code fences.",
        "- Keep the body under 180 words unless the details clearly need more.",
        "- Use only the facts provided. If something important is missing, use a [placeholder] in square brackets.",
        "- Sound like a real person: specific, polite and confident, never over the top.",
      ].join("\n"),
    buildMessages: (data) => {
      const types = {
        application: "a job application email (to send with a resume)",
        "follow-up": "a polite follow-up after applying or interviewing with no reply yet",
        "thank-you": "a thank-you email after an interview",
        referral: "a request for a job referral",
        networking: "a networking / informational interview request",
        acceptance: "accepting a job offer",
        decline: "politely declining a job offer",
      };
      const tones = { professional: "professional", friendly: "warm and friendly", confident: "confident and direct" };

      const type = types[data.type] ? data.type : "application";
      const tone = tones[data.tone] || tones.professional;
      const d = {
        yourName: clean(data.yourName, 80),
        recipient: clean(data.recipient, 100),
        company: clean(data.company, 100),
        role: clean(data.role, 120),
        details: clean(data.details, 2000),
      };
      if (!d.yourName || !d.role) {
        throw new UserError("Please enter your name and the job role.");
      }
      const lines = [
        "Write " + types[type] + ".",
        "Tone: " + tone + ".",
        "",
        field("My name", d.yourName),
        field("Recipient", d.recipient || "Hiring Manager"),
        field("Company", d.company),
        field("Job role", d.role),
        field("Key points to include", d.details),
      ];
      return [{ role: "user", content: lines.filter(Boolean).join("\n") }];
    },
  },

  /* ----- Learning Planner ----- */
  planner: {
    maxTokens: 4000,
    system: () =>
      [
        "You are an expert learning coach who builds realistic study plans for students, freshers and career switchers.",
        "Many users are in India; when relevant, mention skills Indian employers ask for.",
        "",
        "Write the plan in Markdown using EXACTLY this structure:",
        "# <Goal> — <N>-week learning plan",
        "One short paragraph: who this plan is for, the weekly time it needs and what they will be able to do at the end.",
        "## Week 1: <topic>",
        "**Learn:** 2–4 specific topics",
        "**Practice:** 1–3 hands-on tasks",
        "**Free resources:** 1–3 well-known FREE resources (by name only, no links), e.g. official docs, freeCodeCamp, Khan Academy, NPTEL, YouTube channel names",
        "**Milestone:** one clear thing they can do by the end of the week",
        "(repeat '## Week N: <topic>' for EVERY week — one heading per week, never 'Weeks 1-2')",
        "## Final project",
        "One portfolio project idea with 3–4 bullet steps.",
        "## Tips to stay on track",
        "3 short bullets.",
        "",
        "Rules: fit the work to the hours per week given; start from the learner's level and skip what they already know;",
        "never invent URLs; keep the whole plan under 1,100 words; output only the plan.",
      ].join("\n"),
    buildMessages: (data) => {
      const d = plannerInput(data);
      const lines = [
        "Create my learning plan.",
        "",
        field("Goal", d.goal),
        field("Current level", d.level),
        field("Plan length", d.weeks + " weeks"),
        field("Time available", d.hours + " hours per week"),
        field("I already know", d.known),
        field("Special requests", d.focus),
      ];
      return [{ role: "user", content: lines.filter(Boolean).join("\n") }];
    },
  },

  /* ----- Interview Assistant (chat) ----- */
  interview: {
    maxTokens: 1500,
    chat: true,
    system: (setup) => {
      const role = clean(setup.role, 120) || "the candidate's chosen role";
      const level = clean(setup.level, 60) || "entry level";
      const round = clean(setup.round, 60) || "mixed HR and technical";
      const focus = clean(setup.focus, 300);
      return [
        "You are a friendly but honest interviewer and interview coach.",
        "You are running a mock interview for a " + level + " candidate applying for: " + role + ".",
        "Interview type: " + round + "." + (focus ? " Focus areas: " + focus + "." : ""),
        "",
        "How to run the interview:",
        "- There will be 5 questions in total. Ask ONE question at a time, labelled like **Question 1 of 5**.",
        "- Start by greeting the candidate in one sentence, then ask Question 1.",
        "- After each answer, give short feedback in this format:",
        "  **Score:** X/10",
        "  **What went well:** one or two sentences",
        "  **How to improve:** 1–3 bullet points",
        "  **Stronger answer example:** 2–4 sentences (only when it would help)",
        "  Then ask the next question.",
        "- If the candidate asks for a hint or says they don't know, give a helpful hint and let them try again.",
        "- After the answer to Question 5, give a final summary: overall score out of 10, top 3 strengths,",
        "  top 3 things to practise, and end with the words **Interview complete**.",
        "- Keep questions realistic for the role and level. Use Markdown formatting. Be encouraging but truthful.",
      ].join("\n");
    },
    // The AI speaks first, so we start the chat with a hidden "begin" message.
    firstUserMessage: "Hello! I'm ready. Please start the interview.",
  },

  /* ----- Career Q&A (chat) ----- */
  career: {
    maxTokens: 2000,
    chat: true,
    system: () =>
      [
        "You are SkillPilot, a friendly AI career assistant for students, freshers and career switchers.",
        "Many users are in India, so mention the Indian job market when it is relevant, but don't assume.",
        "",
        "How to answer:",
        "- Give practical, specific and honest advice: concrete steps, skills, free resources and realistic timelines.",
        "- Use short paragraphs, bullet points and **bold** key ideas (Markdown). Keep answers focused, usually under 300 words.",
        "- For salary questions, give approximate ranges and say they vary by city, company and skills.",
        "- If a question is unclear, ask one short follow-up question.",
        "- Stay on careers, learning, jobs and workplace topics. Politely steer other topics back to careers.",
      ].join("\n"),
  },
};

/* ---------- Turn a chat history into safe messages ---------- */
function buildChatMessages(tool, rawMessages) {
  if (!Array.isArray(rawMessages)) throw new UserError("Invalid conversation.");

  // Keep only valid messages, and only the last 20 to limit cost.
  let messages = rawMessages
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
    .filter((m) => m.content.length > 0)
    .slice(-20);

  if (tool.firstUserMessage) {
    // Interview: add the hidden "please start" message at the beginning.
    if (messages[0] && messages[0].role === "user") messages.shift();
    messages.unshift({ role: "user", content: tool.firstUserMessage });
  } else {
    while (messages.length && messages[0].role !== "user") messages.shift();
  }

  // Messages must alternate user → assistant → user … and end with the user.
  for (let i = 0; i < messages.length; i++) {
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (messages[i].role !== expected) throw new UserError("Invalid conversation order.");
  }
  if (!messages.length || messages[messages.length - 1].role !== "user") {
    throw new UserError("Please type a message first.");
  }
  return messages;
}

/* =========================================================
   5. CALLING THE AI PROVIDERS
   Each function sends the conversation and returns the reply text.
   ========================================================= */

async function callGemini(system, messages, maxTokens) {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(provider.model) +
    ":generateContent";

  const data = await postJSON(url, { "x-goog-api-key": apiKey }, {
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const candidate = data.candidates && data.candidates[0];
  const text = candidate && candidate.content && Array.isArray(candidate.content.parts)
    ? candidate.content.parts.map((p) => p.text || "").join("")
    : "";
  if (!text && candidate && candidate.finishReason === "SAFETY") {
    throw new UserError("The AI declined to answer that. Please rephrase and try again.");
  }
  return text;
}

async function callClaude(system, messages, maxTokens) {
  const data = await postJSON(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    { model: provider.model, max_tokens: maxTokens, system: system, messages: messages }
  );
  return (data.content || [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

async function callOpenAI(system, messages, maxTokens) {
  const data = await postJSON(
    "https://api.openai.com/v1/chat/completions",
    { Authorization: "Bearer " + apiKey },
    {
      model: provider.model,
      messages: [{ role: "system", content: system }].concat(messages),
      max_completion_tokens: maxTokens,
    }
  );
  const choice = data.choices && data.choices[0];
  return (choice && choice.message && choice.message.content) || "";
}

/* Sends a JSON request and turns provider errors into friendly messages. */
async function postJSON(url, headers, body) {
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json" }, headers),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90 * 1000),
    });
  } catch (error) {
    console.error("[AI] Network error:", error.message);
    throw new UserError("Could not reach the AI service. Check your internet connection and try again.", 502);
  }

  const text = await response.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch (error) {
    // not JSON — keep the raw text for the log
  }

  if (!response.ok) {
    console.error("[AI] " + provider.label + " error " + response.status + ":", text.slice(0, 500));
    if (response.status === 400) throw new UserError("The AI service rejected the request. Check the model name in your .env file.", 502);
    if (response.status === 401 || response.status === 403) throw new UserError("The AI API key is not valid. Check the key in your .env file.", 502);
    if (response.status === 404) throw new UserError("AI model not found. Check the model name in your .env file.", 502);
    if (response.status === 429) throw new UserError("The AI service is busy or your free quota is used up. Please wait a minute and try again.", 429);
    throw new UserError("The AI service had a problem. Please try again in a moment.", 502);
  }
  return data;
}

/* =========================================================
   6. DEMO MODE — sample answers when no API key is set
   ========================================================= */

const DEMO_NOTE = "\n\n---\n*Demo mode: this is a sample answer. Add an API key to your .env file to get real AI answers.*";

function demoReply(toolName, payload) {
  if (toolName === "resume") {
    return buildSimpleResume(payload.data || {}) +
      "\n\n---\n*Made without AI (no API key yet). Add a Gemini key to get AI-polished wording.*";
  }

  if (toolName === "planner") {
    return buildSimplePlan(payload.data || {}) +
      "\n\n---\n*Made without AI (no API key yet). Add a Gemini key for a plan tailored to your goal.*";
  }

  if (toolName === "email") {
    const d = payload.data || {};
    return [
      "Subject: Application for " + clean(d.role, 100) + (clean(d.company, 80) ? " at " + clean(d.company, 80) : ""),
      "",
      "Dear " + (clean(d.recipient, 80) || "Hiring Manager") + ",",
      "",
      "I am writing to apply for the " + clean(d.role, 100) + " role" + (clean(d.company, 80) ? " at " + clean(d.company, 80) : "") +
        ". I have attached my resume for your review.",
      "",
      "[Demo mode: add an API key to your .env file and the AI will write a personalised email using your key points.]",
      "",
      "Thank you for your time and consideration.",
      "",
      "Best regards,",
      clean(d.yourName, 80),
    ].join("\n");
  }

  if (toolName === "interview") {
    const setup = payload.setup || {};
    const asked = (payload.messages || []).filter((m) => m.role === "assistant").length;
    const questions = [
      "Tell me about yourself and why you're interested in this role.",
      "Describe a project you're proud of. What was your part in it?",
      "Tell me about a time you faced a difficult problem. How did you solve it?",
      "What are your biggest strengths and one area you're working to improve?",
      "Where do you see yourself in two years?",
    ];
    if (asked === 0) {
      return "Welcome! Let's begin your mock interview for **" + (clean(setup.role, 100) || "your role") + "**.\n\n**Question 1 of 5**\n\n" + questions[0] + DEMO_NOTE;
    }
    if (asked >= 5) {
      return "**Score:** 7/10\n\n**Overall:** Good effort!\n\n**Interview complete**" + DEMO_NOTE;
    }
    return "**Score:** 7/10\n\n**What went well:** Clear and honest answer.\n\n**How to improve:**\n- Add one specific example\n- Mention a measurable result\n\n**Question " +
      (asked + 1) + " of 5**\n\n" + questions[asked] + DEMO_NOTE;
  }

  // career
  const last = (payload.messages || []).slice(-1)[0];
  return "Great question! You asked: *\"" + clean(last && last.content, 200) + "\"*\n\nHere's how I'd approach it:\n\n" +
    "1. **Get clear on your goal**: pick one target role.\n2. **Learn the core skills**: focus on the top 3 skills in job posts.\n" +
    "3. **Build proof**: 2–3 small projects you can show.\n4. **Apply smartly**: tailor your resume for each job." + DEMO_NOTE;
}

/* ---------- Simple resume builder (works without any AI) ----------
   Turns the form details into a clean, complete fresher resume. */
function buildSimpleResume(data) {
  const d = {
    fullName: clean(data.fullName, 80),
    targetRole: clean(data.targetRole, 120),
    email: clean(data.email, 120),
    phone: clean(data.phone, 40),
    location: clean(data.location, 80),
    links: clean(data.links, 300),
    summary: clean(data.summary, 1500),
    experience: clean(data.experience, 4000),
    projects: clean(data.projects, 2500),
    education: clean(data.education, 1500),
    skills: clean(data.skills, 1000),
    certifications: clean(data.certifications, 800),
  };

  // "sql, excel ,power bi" -> ["SQL", "Excel", "Power BI"]-style tidy list
  // (commas inside brackets stay together: "Excel (pivot tables, VLOOKUP)")
  const splitList = (text) => {
    const parts = [];
    let current = "";
    let depth = 0;
    for (const ch of text) {
      if (ch === "(") depth++;
      if (ch === ")" && depth > 0) depth--;
      if (depth === 0 && /[,;\n|]/.test(ch)) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    parts.push(current);
    return parts.map((s) => s.trim()).filter(Boolean);
  };

  // Makes a tidy sentence: capital first letter, full stop at the end.
  const sentence = (text) => {
    let s = text.trim().replace(/^[-•*\d.)\s]+/, "");
    if (!s) return "";
    s = s.charAt(0).toUpperCase() + s.slice(1);
    return /[.!?)]$/.test(s) ? s : s + ".";
  };

  // Turns free text into bullet points (one per line, or one per sentence).
  const toBullets = (text) => {
    let parts = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (parts.length === 1) parts = parts[0].split(/(?<=[.!?])\s+/);
    return parts.map(sentence).filter(Boolean).map((s) => "- " + s).join("\n");
  };

  const skills = splitList(d.skills);
  const topSkills = skills.slice(0, 3).join(", ");
  const sections = [];

  // Header
  sections.push("# " + d.fullName.toUpperCase());
  const contact = [d.location, d.phone, d.email].concat(splitList(d.links)).filter(Boolean);
  if (contact.length) sections.push(contact.join(" | "));

  // Career objective
  sections.push("## Career Objective");
  sections.push(
    d.summary
      ? sentence(d.summary.replace(/\s*\n\s*/g, " "))
      : "Motivated and hard-working candidate seeking an entry-level " + d.targetRole + " role" +
        (topSkills ? ", with a good foundation in " + topSkills : "") +
        ". Eager to learn, solve real problems and contribute to the team's goals."
  );

  // Education
  if (d.education) {
    sections.push("## Education");
    sections.push(d.education.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => "- " + l).join("\n"));
  }

  // Skills
  if (skills.length) {
    sections.push("## Skills");
    sections.push(skills.join(" | "));
  }

  // Experience / internships
  if (d.experience) {
    sections.push("## Experience");
    sections.push(toBullets(d.experience));
  }

  // Projects: "Name: what it does" lines become a title + bullet
  if (d.projects) {
    sections.push("## Projects");
    d.projects.split(/\n+/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
      const match = line.match(/^([^:–-]{3,80})\s*[:–-]\s+(.+)$/);
      if (match) {
        sections.push("### " + match[1].trim());
        sections.push(toBullets(match[2]));
      } else {
        sections.push(toBullets(line));
      }
    });
  }

  // Certifications
  if (d.certifications) {
    sections.push("## Certifications");
    sections.push(splitList(d.certifications).map((c) => "- " + c).join("\n"));
  }

  // Strengths
  sections.push("## Strengths");
  sections.push(
    "- Quick learner and good at problem solving\n- Good communication and teamwork\n- Hard-working, punctual and responsible"
  );

  // Declaration
  sections.push("## Declaration");
  sections.push("I hereby declare that the information given above is true to the best of my knowledge.");
  sections.push((d.location ? "Place: " + d.location.split(",")[0].trim() : "Place: ") + "\n\n**" + d.fullName.toUpperCase() + "**");

  return sections.join("\n\n");
}

/* ---------- Learning Planner: clean input + no-AI backup plan ---------- */
function plannerInput(data) {
  const goal = clean(data.goal, 150);
  if (goal.length < 3) throw new UserError("Please enter your learning goal.");
  const weeks = [4, 8, 12, 16].includes(Number(data.weeks)) ? Number(data.weeks) : 8;
  const hours = [5, 10, 15, 20].includes(Number(data.hours)) ? Number(data.hours) : 10;
  const levels = ["Complete beginner", "I know some basics", "Intermediate"];
  return {
    goal: goal,
    level: levels.includes(data.level) ? data.level : levels[0],
    weeks: weeks,
    hours: hours,
    known: clean(data.known, 600),
    focus: clean(data.focus, 300),
  };
}

function buildSimplePlan(data) {
  const d = plannerInput(data);
  const phases = [
    { name: "Foundations", learn: "The basic ideas, words and tools used in " + d.goal, practice: "Set up your tools and follow one beginner tutorial end to end", milestone: "Explain the basics of " + d.goal + " in your own words" },
    { name: "Core skills", learn: "The 2–3 most-asked skills in job posts for " + d.goal, practice: "Do 5–10 small exercises on each skill", milestone: "Solve simple problems without looking at the answer" },
    { name: "Tools and practice", learn: "The main tools professionals use day to day", practice: "Recreate one real-world example from a tutorial, then change it", milestone: "Build something small on your own" },
    { name: "Real project", learn: "How to plan and finish a small project", practice: "Start your portfolio project (see Final project below)", milestone: "A working first version of your project" },
    { name: "Portfolio and job prep", learn: "How to present your work and answer interview questions", practice: "Polish your project, write a short README, update your resume", milestone: "Share your project and apply to 5 roles or internships" },
  ];
  const lines = [];
  lines.push("# " + d.goal + " — " + d.weeks + "-week learning plan");
  lines.push(
    "A step-by-step plan for a " + d.level.toLowerCase() + " with about " + d.hours +
      " hours a week. By the end you will have the core skills, one portfolio project and be ready to apply."
  );
  for (let week = 1; week <= d.weeks; week++) {
    const phase = phases[Math.min(phases.length - 1, Math.floor(((week - 1) / d.weeks) * phases.length))];
    lines.push("## Week " + week + ": " + phase.name);
    lines.push(
      "**Learn:** " + phase.learn + "\n\n" +
      "**Practice:** " + phase.practice + "\n\n" +
      "**Free resources:** YouTube beginner courses, freeCodeCamp, official documentation\n\n" +
      "**Milestone:** " + phase.milestone
    );
  }
  lines.push("## Final project");
  lines.push("- Pick a small real problem related to " + d.goal + "\n- Plan it in 3–4 steps\n- Build it and write what you learned\n- Share it on GitHub or LinkedIn");
  lines.push("## Tips to stay on track");
  lines.push("- Fix a daily study time\n- Tick off each week when you finish it\n- Revise the previous week for 30 minutes before starting a new one");
  return lines.join("\n\n");
}

/* =========================================================
   7. THE WEB SERVER
   ========================================================= */

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "same-origin");

  const url = new URL(req.url, "http://localhost");

  try {
    // --- API: which AI is connected? ---
    if (url.pathname === "/api/status" && req.method === "GET") {
      return sendJSON(res, 200, {
        mode: DEMO_MODE ? "demo" : "live",
        provider: DEMO_MODE ? "Demo" : provider.label,
        model: DEMO_MODE ? null : provider.model,
      });
    }

    // --- API: ask the AI ---
    if (url.pathname === "/api/ai") {
      if (req.method !== "POST") return sendJSON(res, 405, { error: "Use POST." });

      const ip = clientIp(req);
      if (isRateLimited(ip)) {
        return sendJSON(res, 429, { error: "You're sending requests too quickly. Please wait a few minutes." });
      }

      const payload = await readJSONBody(req);
      const toolName = payload.tool;
      const tool = TOOLS[toolName];
      if (!tool) return sendJSON(res, 400, { error: "Unknown tool." });

      const system = tool.system(payload.setup || {});
      const messages = tool.chat
        ? buildChatMessages(tool, payload.messages)
        : tool.buildMessages(payload.data || {});

      let text;
      if (DEMO_MODE) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        text = demoReply(toolName, payload);
      } else {
        text = await provider.call(system, messages, tool.maxTokens);
      }

      if (!text || !text.trim()) {
        return sendJSON(res, 502, { error: "The AI returned an empty answer. Please try again." });
      }
      return sendJSON(res, 200, { text: text.trim() });
    }

    // --- API: accounts and contact form (Supabase) ---
    if (url.pathname === "/api/config" && req.method === "GET") {
      return sendJSON(res, 200, { accounts: SUPABASE_ON });
    }

    if (url.pathname === "/api/auth/register" || url.pathname === "/api/auth/login" || url.pathname === "/api/contact") {
      if (req.method !== "POST") return sendJSON(res, 405, { error: "Use POST." });
      const ip = clientIp(req);
      if (isRateLimited(ip)) {
        return sendJSON(res, 429, { error: "Too many attempts. Please wait a few minutes." });
      }
      if (!SUPABASE_ON) {
        return sendJSON(res, 503, { error: "Accounts are not set up yet. Add your Supabase details to .env." });
      }
      const body = await readJSONBody(req);
      if (url.pathname === "/api/auth/register") return sendJSON(res, 200, await registerUser(body));
      if (url.pathname === "/api/auth/login") return sendJSON(res, 200, await loginUser(body));
      return sendJSON(res, 200, await saveContactMessage(body));
    }

    // --- API: the logged-in user's saved resumes (Supabase "resumes" table) ---
    if (url.pathname === "/api/resumes" || url.pathname.startsWith("/api/resumes/")) {
      if (!SUPABASE_ON) {
        return sendJSON(res, 503, { error: "Accounts are not set up yet. Add your Supabase details to .env." });
      }
      const token = bearerToken(req);
      if (!token) return sendJSON(res, 401, { error: "Please log in to use My Resumes." });

      if (url.pathname === "/api/resumes" && req.method === "GET") {
        return sendJSON(res, 200, { resumes: await listResumes(token) });
      }
      if (url.pathname === "/api/resumes" && req.method === "POST") {
        const ip = clientIp(req);
        if (isRateLimited(ip)) return sendJSON(res, 429, { error: "Too many saves. Please wait a few minutes." });
        return sendJSON(res, 200, { resume: await saveResume(token, await readJSONBody(req)) });
      }
      const id = decodeURIComponent(url.pathname.slice("/api/resumes/".length));
      if (id && req.method === "DELETE") {
        await deleteResume(token, id);
        return sendJSON(res, 200, { status: "deleted" });
      }
      return sendJSON(res, 405, { error: "Not allowed." });
    }

    if (url.pathname.startsWith("/api/")) return sendJSON(res, 404, { error: "Not found." });

    // --- Website files ---
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      return res.end();
    }
    return serveFile(res, url.pathname);
  } catch (error) {
    if (error instanceof UserError) return sendJSON(res, error.status, { error: error.message });
    console.error("[Server] Unexpected error:", error);
    return sendJSON(res, 500, { error: "Something went wrong on the server." });
  }
});

/* Sends a file from the public folder (and nothing outside it). */
function serveFile(res, urlPath) {
  let relative;
  try {
    relative = decodeURIComponent(urlPath);
  } catch (error) {
    res.writeHead(400);
    return res.end("Bad request");
  }
  if (relative.endsWith("/")) relative += "index.html";

  const filePath = path.normalize(path.join(PUBLIC_DIR, relative));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      return res.end('<h1>Page not found</h1><p><a href="/">Go to the home page</a></p>');
    }
    const type = MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    res.end(content);
  });
}

/* =========================================================
   7b. SUPABASE: ACCOUNTS AND CONTACT MESSAGES
   The browser talks only to this server; this server talks to Supabase.
   ========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function supabaseRequest(pathAndQuery, body, extraHeaders) {
  const headers = Object.assign({ "Content-Type": "application/json", apikey: SUPABASE_KEY }, extraHeaders || {});
  // Old-style anon keys are JWTs ("eyJ...") and also go in Authorization.
  // New publishable keys ("sb_publishable_...") must only be sent as apikey.
  if (SUPABASE_KEY.startsWith("eyJ")) headers.Authorization = "Bearer " + SUPABASE_KEY;

  let response;
  try {
    response = await fetch(SUPABASE_URL + pathAndQuery, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error("[Supabase] Network error:", error.message);
    throw new UserError("Could not reach the database. Check your internet connection and SUPABASE_URL.", 502);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }
  return { ok: response.ok, status: response.status, data: data };
}

function supabaseMessage(data, fallback) {
  if (!data) return fallback;
  return data.msg || data.error_description || data.message || data.error || fallback;
}

function publicUser(user, fallbackName) {
  const meta = (user && user.user_metadata) || {};
  return {
    id: user && user.id,
    email: user && user.email,
    name: meta.full_name || fallbackName || (user && user.email ? user.email.split("@")[0] : "Friend"),
  };
}

async function registerUser(body) {
  const name = clean(body.name, 80);
  const email = clean(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (name.length < 2) throw new UserError("Please enter your name.");
  if (!EMAIL_PATTERN.test(email)) throw new UserError("Please enter a valid email address.");
  if (password.length < 8 || password.length > 72) throw new UserError("Password must be 8 to 72 characters.");

  const result = await supabaseRequest("/auth/v1/signup", {
    email: email,
    password: password,
    data: { full_name: name },
  });

  if (!result.ok) {
    const message = supabaseMessage(result.data, "Could not create the account.");
    if (/already registered|already exists/i.test(message)) {
      throw new UserError("An account with this email already exists. Please log in.", 409);
    }
    if (result.status === 429) throw new UserError("Too many sign-ups right now. Please wait a minute.", 429);
    throw new UserError(message, result.status >= 500 ? 502 : 400);
  }

  const data = result.data || {};
  // If "Confirm email" is ON in Supabase, there is no session yet.
  if (data.access_token) {
    return { status: "signed_in", session: sessionFrom(data, name) };
  }
  return { status: "confirm_email", message: "Account created! We sent a confirmation link to " + email + ". Click it, then log in." };
}

async function loginUser(body) {
  const email = clean(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!EMAIL_PATTERN.test(email) || !password) throw new UserError("Please enter your email and password.");

  const result = await supabaseRequest("/auth/v1/token?grant_type=password", { email: email, password: password });
  if (!result.ok) {
    const message = supabaseMessage(result.data, "");
    if (/confirm/i.test(message)) {
      throw new UserError("Please confirm your email first. Check your inbox for the link.", 403);
    }
    if (result.status === 429) throw new UserError("Too many attempts. Please wait a minute.", 429);
    throw new UserError("Wrong email or password.", 401);
  }
  return { status: "signed_in", session: sessionFrom(result.data) };
}

function sessionFrom(data, fallbackName) {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    user: publicUser(data.user, fallbackName),
  };
}

async function saveContactMessage(body) {
  const name = clean(body.name, 80);
  const email = clean(body.email, 200);
  const topic = clean(body.topic, 40) || "general";
  const message = clean(body.message, 4000);
  if (name.length < 2) throw new UserError("Please enter your name.");
  if (!EMAIL_PATTERN.test(email)) throw new UserError("Please enter a valid email address.");
  if (message.length < 10) throw new UserError("Please write a message (at least 10 characters).");

  let result;
  try {
    result = await supabaseRequest(
    "/rest/v1/contact_messages",
    { name: name, email: email, topic: topic, message: message },
    { Prefer: "return=minimal" }
    );
  } catch (error) {
    result = { ok: false, status: 0, data: { message: error.message } };
  }
  if (!result.ok) {
    // Table missing or Supabase having trouble: keep the message on this
    // computer instead, so nothing is lost. See data/contact-messages.json
    const reason = supabaseMessage(result.data, "HTTP " + result.status);
    if (result.status === 404 || /relation|does not exist|schema cache/i.test(reason)) {
      console.log("  ⚠  contact_messages table not found in Supabase (run supabase-setup.sql). Saved the message locally.");
    } else {
      console.log("  ⚠  Supabase could not save the contact message (" + reason + "). Saved it locally.");
    }
    saveMessageLocally({ name: name, email: email, topic: topic, message: message });
  }
  return { status: "saved" };
}

function saveMessageLocally(entry) {
  const dir = path.join(__dirname, "data");
  const file = path.join(dir, "contact-messages.json");
  let list = [];
  try {
    list = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!Array.isArray(list)) list = [];
  } catch (error) {
    list = [];
  }
  list.push(Object.assign({ created_at: new Date().toISOString() }, entry));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify(list, null, 2));
}

/* ---------- Saved resumes ----------
   Every request uses the LOGGED-IN USER's token, so Supabase's
   Row Level Security makes sure people only see their own resumes. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function bearerToken(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/);
  return match ? match[1] : "";
}

async function supabaseUserRequest(method, pathAndQuery, token, body, extraHeaders) {
  const headers = Object.assign(
    { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
    extraHeaders || {}
  );
  let response;
  try {
    response = await fetch(SUPABASE_URL + pathAndQuery, {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error("[Supabase] Network error:", error.message);
    throw new UserError("Could not reach the database. Check your internet connection.", 502);
  }
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = null;
  }
  if (!response.ok) {
    const reason = supabaseMessage(data, "HTTP " + response.status);
    console.log("  ⚠  Supabase (resumes) " + response.status + ": " + reason);
    if (response.status === 401 || /jwt|expired/i.test(reason)) {
      throw new UserError("Your login has expired. Please log in again.", 401);
    }
    if (response.status === 404 || /relation|does not exist|schema cache/i.test(reason)) {
      throw new UserError("The 'resumes' table is missing in Supabase. Run the resumes SQL in the SQL Editor.", 500);
    }
    throw new UserError("The database could not do that right now. Please try again.", 502);
  }
  return data;
}

async function listResumes(token) {
  const rows = await supabaseUserRequest(
    "GET",
    "/rest/v1/resumes?select=id,title,target_role,content,created_at&order=created_at.desc&limit=100",
    token
  );
  return Array.isArray(rows) ? rows : [];
}

async function saveResume(token, body) {
  const content = clean(body.content, 20000)
    .replace(/\n+---\n\*(Demo mode|Made without AI)[\s\S]*$/, "")
    .trim();
  if (content.length < 20) throw new UserError("There is no resume to save yet.");
  const title = clean(body.title, 150) || "My resume";
  const targetRole = clean(body.targetRole, 120) || null;

  const rows = await supabaseUserRequest(
    "POST",
    "/rest/v1/resumes",
    token,
    { title: title, target_role: targetRole, content: content },
    { Prefer: "return=representation" }
  );
  return Array.isArray(rows) ? rows[0] : rows;
}

async function deleteResume(token, id) {
  if (!UUID_PATTERN.test(id)) throw new UserError("Invalid resume.");
  await supabaseUserRequest("DELETE", "/rest/v1/resumes?id=eq." + id, token);
}

/* =========================================================
   8. SMALL HELPERS
   ========================================================= */

class UserError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status || 400;
  }
}

function clean(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function field(label, value) {
  return value ? label + ": " + value : "";
}

function sendJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readJSONBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new UserError("Your input is too long.", 413));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(new UserError("Invalid request."));
      }
    });
    req.on("error", reject);
  });
}

/* Reads KEY=value lines from the .env file into process.env */
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equals = trimmed.indexOf("=");
    if (equals === -1) continue;
    const key = trimmed.slice(0, equals).trim();
    let value = trimmed.slice(equals + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

/* ---------- Start! ---------- */
server.listen(PORT, () => {
  console.log("");
  console.log("  SkillPilot AI is running!");
  console.log("  Open this in your browser:  http://localhost:" + PORT);
  console.log("");
  console.log("  Accounts: " + (SUPABASE_ON ? "ON — Supabase (" + SUPABASE_URL + ")" : "preview only (add SUPABASE_URL and SUPABASE_ANON_KEY to .env)"));
  if (DEMO_MODE) {
    if (chosen !== "demo" && !provider) {
      console.log('  ⚠  Unknown AI_PROVIDER "' + chosen + '". Use gemini, claude, openai or demo.');
    } else if (chosen !== "demo") {
      console.log("  ⚠  No API key found for " + provider.label + " (" + provider.keyName + " in .env).");
    }
    console.log("  AI mode: DEMO (sample answers). Add an API key to .env for real AI.");
  } else {
    console.log("  AI mode: LIVE — " + provider.label + " (" + provider.model + ")");
  }
  console.log("  Press Ctrl + C to stop the server.");
  console.log("");
});
