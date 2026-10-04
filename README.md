# SkillPilot AI

**Your AI-powered career and learning companion.**

Pages: Home, About, AI Tools, Contact, Login / Register, My Resumes.
AI tools: Resume Builder, Interview Practice, Job Email Generator, Learning Planner, AI Career Assistant.

- Front end: plain HTML, CSS, JavaScript (`public/`)
- Server: Node.js 18+ (`server.js`), no extra packages
- AI: Google Gemini (or Claude / OpenAI)
- Database & accounts: Supabase

## Run on your computer

1. Copy `.env.example` → `.env` and fill in your keys.
2. `node server.js`
3. Open http://localhost:3000

## Put it online (Render.com, free)

1. Upload this folder to a GitHub repository (**without** `.env`).
2. Render.com → **New → Web Service** → pick the repository.
   - Runtime: **Node**
   - Build command: `npm install`
   - Start command: `node server.js`
   - Instance type: **Free**
3. **Environment** → add:

   | Key | Value |
   |---|---|
   | `AI_PROVIDER` | `gemini` |
   | `GEMINI_API_KEY` | your Gemini key |
   | `GEMINI_MODEL` | `gemini-3.5-flash` |
   | `SUPABASE_URL` | `https://<your-project>.supabase.co` |
   | `SUPABASE_ANON_KEY` | your `sb_publishable_…` key |
   | `TRUST_PROXY` | `1` |

4. Deploy. Your site will be at `https://<name>.onrender.com`.
5. Supabase → **Authentication → URL Configuration** → set **Site URL** to that address.

Note: the free Render plan sleeps after 15 minutes without visitors; the first visit after that takes about a minute.

## Database

Run `supabase-setup.sql` once in Supabase → SQL Editor (safe to run again).
