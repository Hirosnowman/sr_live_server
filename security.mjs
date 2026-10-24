// ===============================
// security.mjs — 入力検査と取得先の許可リスト（2026-10-24）
// server.js から切り出した。シェルへ値を渡さない（execFile の配列渡し）ための検査と、
// サーバー側取得（proxy_cf / convert_url）の SSRF 対策の許可リスト。
// server.js を起動せずに単体テストできるよう、純粋な関数だけをここに置く。
// ===============================

// Python スクリプトへ渡す引数の検査。
// execFile の配列渡しなのでシェル注入は作りの上で起きないが、
// 想定外の値でスクリプトを無駄に起動しないよう形も絞る。
export const RE_DIGITS = /^[0-9]+$/;        // room_id / avatar_id（数字だけ）
export const RE_URLKEY = /^[A-Za-z0-9_-]+$/; // url_key（英数と _ -）

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
