/* =========================================================
   SkillPilot AI — one-time database setup
   Creates the contact_messages table in Supabase WITHOUT the
   dashboard's SQL Editor. Run it by double-clicking setup-db.bat.

   Needs two lines in .env:
     SUPABASE_DB_URL=      (Connect → Session pooler connection string)
     SUPABASE_DB_PASSWORD= (the database password you saved)
   ========================================================= */

const fs = require("fs");
const path = require("path");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let value = t.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function fail(message) {
  console.log("");
  console.log("  ✖ " + message);
  console.log("");
  process.exit(1);
}

async function main() {
  loadEnv(path.join(__dirname, ".env"));

  let url = (process.env.SUPABASE_DB_URL || "").trim();
  const password = process.env.SUPABASE_DB_PASSWORD || "";

  if (!url) fail("SUPABASE_DB_URL is missing in .env. Copy it from Supabase → Connect → Session pooler.");
  if (!/^postgres(ql)?:\/\//.test(url)) fail("SUPABASE_DB_URL should start with postgresql:// — copy the whole connection string.");
  if (url.includes("[YOUR-PASSWORD]")) {
    if (!password) fail("Add SUPABASE_DB_PASSWORD=your-database-password to .env.");
    url = url.replace("[YOUR-PASSWORD]", encodeURIComponent(password));
  }

  let pg;
  try {
    pg = require("pg");
  } catch (error) {
    fail('The "pg" helper is not installed. Run setup-db.bat (it installs it), not setup-db.js.');
  }

  const sql = fs.readFileSync(path.join(__dirname, "supabase-setup.sql"), "utf8");
  const ssl = /sslmode=disable/.test(url) ? false : { rejectUnauthorized: false };
  const client = new pg.Client({ connectionString: url.replace(/[?&]sslmode=disable/, ""), ssl: ssl, connectionTimeoutMillis: 20000 });

  console.log("");
  console.log("  Connecting to your Supabase database...");
  try {
    await client.connect();
  } catch (error) {
    const msg = String(error.message || error);
    if (/password authentication failed/i.test(msg)) fail("Wrong database password. Check SUPABASE_DB_PASSWORD (or reset it in Supabase → Project Settings → Database).");
    if (/ENOTFOUND|ENETUNREACH|EHOSTUNREACH|timeout/i.test(msg)) fail("Could not reach the database (" + msg + "). Use the *Session pooler* connection string, not Direct connection.");
    fail("Could not connect: " + msg);
  }

  try {
    await client.query(sql);
    // Tell Supabase's API about the new table right away.
    await client.query("notify pgrst, 'reload schema'");
    console.log("  ✔ contact_messages table is ready.");

    // Move any messages that were saved on this computer into Supabase.
    const localFile = path.join(__dirname, "data", "contact-messages.json");
    if (fs.existsSync(localFile)) {
      let list = [];
      try {
        list = JSON.parse(fs.readFileSync(localFile, "utf8"));
      } catch (error) {
        list = [];
      }
      let moved = 0;
      for (const m of Array.isArray(list) ? list : []) {
        try {
          await client.query(
            "insert into public.contact_messages (created_at, name, email, topic, message) values ($1, $2, $3, $4, $5)",
            [m.created_at || new Date().toISOString(), m.name, m.email, m.topic || "general", m.message]
          );
          moved++;
        } catch (error) {
          console.log("  (skipped one saved message: " + error.message + ")");
        }
      }
      if (moved > 0) {
        fs.renameSync(localFile, localFile.replace(/\.json$/, ".moved-to-supabase.json"));
        console.log("  ✔ Moved " + moved + " saved message(s) from this computer into Supabase.");
      }
    }

    console.log("");
    console.log("  All done! New contact messages will now be saved in Supabase.");
    console.log("  See them in Supabase → Table Editor → contact_messages.");
    console.log("");
  } catch (error) {
    fail("Setup failed: " + error.message);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
