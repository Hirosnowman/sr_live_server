// ===============================
// security.mjs — 入力検査・取得先の許可リスト・合言葉検証・レート上限（2026-10-24）
// server.js から切り出した。シェルへ値を渡さない（execFile の配列渡し）ための検査、
// サーバー側取得（proxy_cf / convert_url）の SSRF 対策の許可リスト、
// 管理者お知らせ（R3）・Worker 連携（R6）の定数時間比較、レート制限設定（R4）。
// server.js を起動せずに単体テストできるよう、純粋な関数と定数をここに置く。
// ===============================
import crypto from "node:crypto";

// Python スクリプトへ渡す引数の検査。
// execFile の配列渡しなのでシェル注入は作りの上で起きないが、
// 想定外の値でスクリプトを無駄に起動しないよう形も絞る。
export const RE_DIGITS = /^[0-9]+$/;        // room_id / avatar_id（数字だけ）
export const RE_URLKEY = /^[A-Za-z0-9_-]+$/; // url_key（英数と _ -）

// R4: IP ごとのレート上限（1分あたり）と WebSocket 同時接続上限。
// 画面のポーリング間隔からの逆算:
// - /comment_log: 10秒おき(6回/分/画面)。親子2画面で12回/分 → 5倍余裕の 60回/分
// - /room_profile: multi_room 6窓が5秒おきに配信待機すると最大 72回/分 → 120回/分
// - /gift_list: ルーム接続時1回(マルチ6窓一斉接続で6回/分) → 60回/分
// - /api/*: 定常ポーリング(live_polling 1回/分 + event_points 1回/分 + events_ranking 2回/分)
//           ＋ event_ranking.js の全0pt時バースト(最大30〜100件並列) ＋ proxy_cf 名前履歴取得 → 180回/分
// - /ws: 親子2画面(4本)＋multi_room 6窓+統計(7本)＝11本 → 1 IP あたり 30本、全体 200本
export const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000,
    commentLogMax: Number(process.env.RATE_LIMIT_COMMENT_LOG) || 60,
    roomProfileMax: Number(process.env.RATE_LIMIT_ROOM_PROFILE) || 120,
    giftListMax: Number(process.env.RATE_LIMIT_GIFT_LIST) || 60,
    apiMax: Number(process.env.RATE_LIMIT_API) || 180,
};

export const WS_LIMIT_CONFIG = {
    maxPerIp: Number(process.env.WS_MAX_PER_IP) || 30,
    maxTotal: Number(process.env.WS_MAX_TOTAL) || 200,
};

// proxy_cf / convert_url が取りに行ってよいホスト。
// SHOWROOM 本体と、本人の Cloudflare Worker（*.workers.dev）だけ。
// これで内部ホスト名・クラウドのメタデータ・任意の第三者サイトへは届かない。
export function isAllowedHost(hostname) {
    const h = (hostname || "").toLowerCase();
    return (
        h === "www.showroom-live.com" ||
        h.endsWith(".showroom-live.com") ||
        h.endsWith(".workers.dev")
    );
}

// R6: proxy_cf が合言葉（X-Worker-Key）を付与してよいホスト（本人の Worker のみ）。
// SHOWROOM などの外部ホストへは合言葉を送らない。
export function isWorkerHost(hostname) {
    const h = (hostname || "").toLowerCase();
    return h.endsWith(".workers.dev");
}

// 文字列を URL として解釈し、https かつ許可ホストの時だけ URL を返す。
// それ以外（URL でない・http・別ホスト・資格情報付き等）は null。
export function parseAllowedUrl(raw) {
    let u;
    try {
        u = new URL(raw);
    } catch (e) {
        return null;
    }
    if (u.protocol !== "https:") return null;
    if (u.username || u.password) return null;
    if (!isAllowedHost(u.hostname)) return null;
    return u;
}

// R3 / R6: 合言葉の定数時間比較。
// 環境変数（expected）が未設定・空文字の時は fail-closed（false）で拒否する。
export function verifySecretKey(provided, expected) {
    if (typeof expected !== "string" || expected.length === 0) return false;
    if (typeof provided !== "string" || provided.length === 0) return false;
    const bufProvided = Buffer.from(provided, "utf8");
    const bufExpected = Buffer.from(expected, "utf8");
    if (bufProvided.byteLength !== bufExpected.byteLength) return false;
    return crypto.timingSafeEqual(bufProvided, bufExpected);
}

// R4: Render のリバースプロキシ配下で WebSocket の接続元 IP を取り出す。
export function getClientIp(req) {
    const xff = req?.headers?.["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim() !== "") {
        return xff.split(",")[0].trim();
    }
    return req?.socket?.remoteAddress || "unknown";
}
