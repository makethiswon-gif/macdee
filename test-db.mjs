
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data } = await supabase.from("contents").select("id, body").eq("channel", "webtoon").order("created_at", { ascending: false }).limit(1);
  console.log("body:", data[0].body);
  console.log("length:", data[0].body.length);
  // simulate logic
  let body = data[0].body;
  if (body.trimStart().startsWith("{")) {
    const jsonStr = body.trim();
    const parsed = JSON.parse(jsonStr);
    console.log("parsed caption:", parsed.caption.substring(0, 50));
  }
}
run();
