// R6: 定数時間での合言葉比較（Web標準 TextEncoder のみ使用・Cloudflare Workers 対応）
function verifyWorkerKey(provided, expected) {
    if (typeof expected !== "string" || expected.length === 0) return false;
    if (typeof provided !== "string" || provided.length === 0) return false;
    const enc = new TextEncoder();
    const bufA = enc.encode(provided);
    const bufB = enc.encode(expected);
    if (bufA.byteLength !== bufB.byteLength) return false;
    let diff = 0;
    for (let i = 0; i < bufA.byteLength; i++) {
        diff |= bufA[i] ^ bufB[i];
    }
    return diff === 0;
}

export default {
    async fetch(request, env, ctx) {
        // 1. CORS Headers
        const corsHeaders = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Worker-Key",
        };

        const setCors = (res) => {
            const newHeaders = new Headers(res.headers);
            for (const [key, value] of Object.entries(corsHeaders)) {
                newHeaders.set(key, value);
            }
            return new Response(res.body, { status: res.status, headers: newHeaders });
        };

        try {
            // 2. Preflight OPTIONS
            if (request.method === "OPTIONS") {
                return new Response(null, { headers: corsHeaders });
            }

            const url = new URL(request.url);
            const params = url.searchParams;

            // --- A. SAVE DATA (POST) ---
            if (request.method === "POST") {
                let body;
                try {
                    body = await request.json();
                } catch (e) {
                    return setCors(new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
                }

                // R6: Render (/api/proxy_cf) から付与される合言葉 (X-Worker-Key) を検証（fail-closed）
                const providedKey = request.headers.get("X-Worker-Key") || "";
                if (!verifyWorkerKey(providedKey, env.CF_WORKER_KEY)) {
                    return setCors(new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
                }

                if (body.action === "save_users" && Array.isArray(body.users)) {
                    const batch = [];
                    for (const u of body.users) {
                        try {
                            const current = await env.DB.prepare("SELECT name, history FROM users WHERE uid = ?").bind(u.uid).first();

                            let newHistory = [];
                            if (current) {
                                try { newHistory = JSON.parse(current.history || "[]"); } catch (e) { }
                                if (current.name && current.name !== u.name) {
                                    newHistory.push({ name: current.name, date: new Date().toISOString() });
                                }
                            }

                            batch.push(
                                env.DB.prepare(`
                                INSERT INTO users (uid, name, last_seen, history) 
                                VALUES (?1, ?2, ?3, ?4)
                                ON CONFLICT(uid) DO UPDATE SET
                                name = excluded.name,
                                last_seen = excluded.last_seen,
                                history = excluded.history
                            `).bind(u.uid, u.name, u.last_seen, JSON.stringify(newHistory))
                            );
                        } catch (err) {
                            console.error("DB Prepare Error:", err);
                        }
                    }

                    if (batch.length > 0) {
                        await env.DB.batch(batch);
                    }
                    return setCors(new Response(JSON.stringify({ success: true, count: batch.length }), { headers: { "Content-Type": "application/json" } }));
                }

                return setCors(new Response(JSON.stringify({ error: "Invalid action or data" }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
            }

            // --- B. GET HISTORY (GET) ---
            if (request.method === "GET" && params.get("action") === "get_names") {
                const uid = params.get("uid");
                if (!uid) return setCors(new Response(JSON.stringify({ error: "UID required" }), { status: 400, headers: { 'Content-Type': 'application/json' } }));

                const result = await env.DB.prepare("SELECT * FROM users WHERE uid = ?").bind(uid).first();

                if (!result) {
                    return setCors(new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } }));
                }

                let history = [];
                try { history = JSON.parse(result.history || "[]"); } catch (e) { }
                return setCors(new Response(JSON.stringify(history), { headers: { "Content-Type": "application/json" } }));
            }

            return setCors(new Response("Not Found", { status: 404 }));

        } catch (e) {
            // Global Error Handler
            return setCors(new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } }));
        }
    },
};
