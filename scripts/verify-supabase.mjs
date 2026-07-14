import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import https from "node:https";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // .env optional when vars are already exported
  }
}

function request(url, headers) {
  return new Promise((resolvePromise, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolvePromise({ status: res.statusCode ?? 0, body });
      });
    });
    req.on("error", reject);
  });
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env",
  );
  process.exit(1);
}

const checks = [
  {
    name: "next_auth.users (NextAuth adapter)",
    headers: { "Accept-Profile": "next_auth" },
    path: "/rest/v1/users?select=count",
  },
  {
    name: "public.topics (app data)",
    headers: { "Accept-Profile": "public" },
    path: "/rest/v1/topics?select=count",
  },
];

let failed = false;
let lastMessage = "";

for (const check of checks) {
  const { status, body } = await request(`${url}${check.path}`, {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...check.headers,
  });

  let message = body;

  try {
    const json = JSON.parse(body);
    message = json.message ?? json.error ?? body;
  } catch {
    // keep raw body
  }

  if (status >= 200 && status < 300) {
    console.log(`OK  ${check.name}`);
  } else {
    failed = true;
    lastMessage = message;
    console.error(`FAIL ${check.name}`);
    console.error(`     ${message}`);
  }
}

if (failed) {
  console.error("");
  if (lastMessage.includes("schema cache")) {
    console.error(
      "PostgREST sees next_auth but has a stale cache. Run supabase/expose-next-auth.sql",
    );
    console.error(
      "Use NOTIFY pgrst, 'reload schema' (reload config alone is not enough).",
    );
  } else if (lastMessage.includes("Invalid schema")) {
    console.error(
      "Expose next_auth in Supabase Dashboard → Project Settings → Data API → Exposed schemas,",
    );
    console.error("or run supabase/expose-next-auth.sql in the SQL Editor.");
  }
  process.exit(1);
}

console.log("");
console.log("Supabase API checks passed. Restart npm run dev and sign in again.");
