# SkillPilot AI

Your AI-powered career and learning companion.

Version 3 connects four tools to a real AI:

| Tool | Page | What it does |
|---|---|---|
| Resume Generator | `resume.html` | Turns your details into an ATS-friendly resume (copy or save as PDF) |
| Interview Assistant | `interview.html` | 5-question mock interview with a score and tips after each answer |
| Job Email Generator | `email.html` | Application, follow-up, thank-you and other job emails |
| AI Career Q&A | `assistant.html` | Chat with an AI career assistant |

---

## Project structure

```
skillpilot-ai/
├── server.js          ← The server: shows the website + talks to the AI
├── package.json       ← Project info (lets you run "npm start")
├── .env.example       ← Settings template (copy it to .env)
├── .env               ← YOUR secret settings and API key (you create this)
├── .gitignore         ← Stops .env being uploaded to GitHub
├── README.md          ← This guide
└── public/            ← Everything the browser can see
    ├── index.html, about.html, tools.html, contact.html
    ├── login.html, register.html
    ├── resume.html, interview.html, email.html, assistant.html
    ├── css/style.css
    └── js/
        ├── script.js  ← Navbar, footer, dark mode, menus, forms
        └── ai.js      ← The AI tools (talks to server.js)
```

**Why a server?** An API key is like a password that costs money. If it were
inside the website's JavaScript, anyone could read it. The server keeps
the key on your computer, and the browser only ever talks to your server.

---

## How to run it (step by step)

### 1. Install Node.js (one time)
Download the **LTS** version from https://nodejs.org and install it.
Check it worked by opening a terminal (in VS Code: **Terminal → New Terminal**) and typing:

```
node --version
```

You should see something like `v22.x.x` (any version 18 or newer is fine).

### 2. Open the project folder
In VS Code: **File → Open Folder…** and choose `skillpilot-ai`.

### 3. Create your `.env` file
Copy `.env.example` and name the copy **`.env`** (with the dot, no other extension).

In VS Code: right-click `.env.example` → **Copy**, then right-click the folder → **Paste**, then rename the copy to `.env`.

### 4. Get a free Gemini API key
1. Go to https://aistudio.google.com/apikey and sign in with Google.
2. Click **Create API key** and copy it.
3. In `.env`, replace `your-gemini-key-here` with your key:

```
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...your-real-key...
```

Using Claude or OpenAI instead? Set `AI_PROVIDER=claude` or `AI_PROVIDER=openai`
and paste the matching key. Those are paid services.

No key yet? Leave it as it is. The site runs in **demo mode** with sample answers.

### 5. Start the server
In the terminal (inside the `skillpilot-ai` folder):

```
node server.js
```

You'll see:

```
  SkillPilot AI is running!
  Open this in your browser:  http://localhost:3000
  AI mode: LIVE — Google Gemini (gemini-3.5-flash)
```

### 6. Open the website
Go to **http://localhost:3000** in your browser. The AI tools are under **AI Tools**.

To stop the server, click the terminal and press **Ctrl + C**.
After changing `.env` or `server.js`, stop and start the server again.
After changing files in `public/`, just refresh the browser.

---

## User accounts + database (Supabase)

Real sign-up, log-in and saving Contact messages use **Supabase** (free).

1. Create a free account at https://supabase.com and click **New project**.
2. In the project: **SQL Editor → New query**, paste everything from
   `supabase-setup.sql`, click **Run**.
3. **Project Settings → API Keys**: copy the **Publishable key**.
   **Project Settings → Data API** (or the Connect button): copy the **Project URL**.
4. In `.env` add:
   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_...
   ```
5. For easy testing: **Authentication → Sign In / Providers → Email**, turn
   **Confirm email** off. (Leave it on for a real launch.)
6. Restart the server. It should say `Accounts: ON`.

Contact messages appear in Supabase under **Table Editor → contact_messages**.
New users appear under **Authentication → Users**.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Badge says **"Server not running"** | You opened the HTML file directly. Run `node server.js` and use http://localhost:3000 |
| Badge says **"Demo mode"** | The key in `.env` is missing or still says `your-...-key-here`. Check the file is named exactly `.env`, then restart the server |
| "The AI API key is not valid" | Copy the key again carefully (no spaces). Restart the server |
| "AI model not found" | The model name in `.env` is wrong or retired. Check your provider's model list and update `GEMINI_MODEL` / `CLAUDE_MODEL` / `OPENAI_MODEL` |
| "Free quota is used up" | Wait a minute (free tiers have per-minute limits) or try again tomorrow |
| `'node' is not recognized` | Node.js isn't installed, or the terminal was open before you installed it. Close and reopen VS Code |
| `EADDRINUSE` | The server is already running in another terminal. Close it, or set `PORT=3001` in `.env` |

---

## Safety rules

- **Never share your `.env` file** or paste your API key into any HTML/JS file.
- If you upload the project to GitHub, `.gitignore` keeps `.env` out automatically.
- If a key is ever leaked, delete it on the provider's website and create a new one.
- `RATE_LIMIT` in `.env` limits how many AI requests each visitor can make (default 30 per 10 minutes).

---

## Customising the AI

The instructions the AI follows ("prompts") are in `server.js`, in the section
**4. THE AI TOOLS**. Edit the text there to change the style, length or rules
of each tool, then restart the server.
