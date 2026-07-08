import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1);
}

const db = createClient({
  url: env["TURSO_DATABASE_URL"]!,
  authToken: env["TURSO_DATABASE_TOKEN"]!,
});

async function query(sql: string, params: any[] = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows;
}

// Get the 10 most recent conversations with message counts and snippets
const conversations = await query(`
  SELECT cs.phone, cs.conversational_state, cs.slots,
         cs.updated_at, cs.comprehension_state,
         (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as msg_count,
         c.id as conv_id
  FROM chat_sessions cs
  JOIN conversations c ON c.phone = cs.phone
  ORDER BY cs.updated_at DESC
  LIMIT 15
`);

console.log("=== RECENT CONVERSATIONS ===\n");
for (const conv of conversations) {
  console.log(`📱 ${conv.phone} (${conv.msg_count} msgs)`);
  console.log(`   State: ${conv.conversational_state} | Comprehension: ${conv.comprehension_state}`);
  console.log(`   Updated: ${new Date(Number(conv.updated_at) * 1000).toLocaleString()}`);
  console.log(`   Slots: ${conv.slots ? (conv.slots as string).substring(0, 120) : "none"}`);
  
  // Get last 5 messages
  const msgs = await query(`
    SELECT role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT 5
  `, [conv.conv_id]);
  
  for (const m of msgs.reverse()) {
    const role = m.role === "user" ? "👤" : "🤖";
    const t = (m.content as string).substring(0, 100);
    console.log(`   ${role} ${t}`);
  }
  console.log("");
}

db.close();
