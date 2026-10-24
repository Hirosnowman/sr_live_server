// 入力検査・許可リスト・合言葉検証・Worker 認証の単体テスト（node --test security.test.mjs）。
// サーバーは起動しない。悪い入力は実サーバーに送らず、検査関数が落とすことだけを確かめる。
import test from "node:test";
import assert from "node:assert/strict";
import {
    RE_DIGITS,
    RE_URLKEY,
    RATE_LIMIT_CONFIG,
    WS_LIMIT_CONFIG,
    isAllowedHost,
    isWorkerHost,
    parseAllowedUrl,
    verifySecretKey,
    getClientIp,
} from "./security.mjs";
import worker from "./worker/src/index.js";

test("RE_DIGITS: 正当な room_id / avatar_id は通る", () => {
    for (const ok of ["516805", "1", "0099"]) assert.ok(RE_DIGITS.test(ok), ok);
});

test("RE_DIGITS: 悪い入力・空は落ちる", () => {
    const bad = [
        "", " ", "12a", "1 2", "1;ls", "1\"; whoami; \"",
        "1$(id)", "1`id`", "1|cat", "1&&x", "1\n2", "../x",
    ];
    for (const b of bad) assert.ok(!RE_DIGITS.test(b), JSON.stringify(b));
});

test("RE_URLKEY: 正当な url_key は通る", () => {
    for (const ok of ["abc", "event-2026_01", "A1_b-2"]) assert.ok(RE_URLKEY.test(ok), ok);
});

test("RE_URLKEY: 区切り・メタ文字は落ちる", () => {
    const bad = [
        "", "a b", "a/b", "a.b", "a;b", "a\"b", "a$(b)",
        "a`b`", "a|b", "a&b", "a\\b", "a\nb",
    ];
    for (const b of bad) assert.ok(!RE_URLKEY.test(b), JSON.stringify(b));
});

test("isAllowedHost: SHOWROOM と workers.dev だけ許す", () => {
    for (const h of [
        "www.showroom-live.com", "api.showroom-live.com",
        "userid-names.geten777.workers.dev",
    ]) assert.ok(isAllowedHost(h), h);
    for (const h of [
        "showroom-live.com.evil.com", "evilshowroom-live.com",
        "example.com", "169.254.169.254", "localhost",
        "metadata.google.internal", "127.0.0.1", "",
    ]) assert.ok(!isAllowedHost(h), h);
});

test("isWorkerHost: workers.dev だけ true（SHOWROOM には秘密ヘッダーを送らない）", () => {
    assert.equal(isWorkerHost("userid-names.geten777.workers.dev"), true);
    assert.equal(isWorkerHost("www.showroom-live.com"), false);
    assert.equal(isWorkerHost("workers.dev.evil.com"), false);
    assert.equal(isWorkerHost(""), false);
});

test("parseAllowedUrl: 正当な取得先 URL を返す", () => {
    for (const u of [
        "https://www.showroom-live.com/api/live/telop?room_id=516805",
        "https://userid-names.geten777.workers.dev/?action=get_names&uid=1",
    ]) assert.ok(parseAllowedUrl(u), u);
});

test("parseAllowedUrl: 許可外・http・URLでない・資格情報付きは null", () => {
    const bad = [
        "http://www.showroom-live.com/x",        // https でない
        "https://example.com/x",                 // 別ホスト
        "https://169.254.169.254/latest/meta",   // メタデータ
        "https://metadata.google.internal/",     // メタデータ
        "https://user:pass@www.showroom-live.com/", // 資格情報付き
        "516805",                                // URL でない（数字）
        "file:///etc/passwd",                    // 別スキーム
        "https://showroom-live.com.evil.com/",   // 接尾辞の偽装
        "ftp://www.showroom-live.com/",          // 別スキーム
        "",                                      // 空
    ];
    for (const b of bad) assert.equal(parseAllowedUrl(b), null, b);
});

test("verifySecretKey (R3/R6): 一致する時だけ true、未設定・不一致・型違いは false", () => {
    assert.equal(verifySecretKey("my-secret-123", "my-secret-123"), true);
    assert.equal(verifySecretKey("wrong-key", "my-secret-123"), false);
    assert.equal(verifySecretKey("my-secret-12", "my-secret-123"), false);
    assert.equal(verifySecretKey("", "my-secret-123"), false);
    assert.equal(verifySecretKey(null, "my-secret-123"), false);
    assert.equal(verifySecretKey(undefined, "my-secret-123"), false);
    // 環境変数未設定時（fail-closed）
    assert.equal(verifySecretKey("my-secret-123", ""), false);
    assert.equal(verifySecretKey("my-secret-123", undefined), false);
    assert.equal(verifySecretKey("", ""), false);
});

test("getClientIp & RATE_LIMIT_CONFIG / WS_LIMIT_CONFIG (R4)", () => {
    assert.equal(getClientIp({ headers: { "x-forwarded-for": "203.0.113.5, 10.0.0.1" } }), "203.0.113.5");
    assert.equal(getClientIp({ headers: {}, socket: { remoteAddress: "127.0.0.1" } }), "127.0.0.1");
    assert.ok(RATE_LIMIT_CONFIG.commentLogMax >= 60);
    assert.ok(RATE_LIMIT_CONFIG.roomProfileMax >= 120);
    assert.ok(RATE_LIMIT_CONFIG.giftListMax >= 60);
    assert.ok(RATE_LIMIT_CONFIG.apiMax >= 180);
    assert.ok(WS_LIMIT_CONFIG.maxPerIp >= 30);
    assert.ok(WS_LIMIT_CONFIG.maxTotal >= 200);
});

test("Worker userid-names (R6): POST は X-Worker-Key 一致時のみ 200、無し・不一致・未設定は 401、GET は公開", async () => {
    const mockDb = {
        prepare: () => ({
            bind: () => ({
                first: async () => ({ name: "OldName", history: "[]" }),
            }),
        }),
        batch: async (items) => items.length,
    };
    const payload = JSON.stringify({
        action: "save_users",
        users: [{ uid: "100", name: "NewName", last_seen: 1700000000 }],
    });

    // 1) 合言葉なし -> 401
    const resNoKey = await worker.fetch(
        new Request("https://userid-names.geten777.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
        }),
        { DB: mockDb, CF_WORKER_KEY: "worker-secret-xyz" }
    );
    assert.equal(resNoKey.status, 401);

    // 2) 合言葉不一致 -> 401
    const resWrongKey = await worker.fetch(
        new Request("https://userid-names.geten777.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Worker-Key": "wrong" },
            body: payload,
        }),
        { DB: mockDb, CF_WORKER_KEY: "worker-secret-xyz" }
    );
    assert.equal(resWrongKey.status, 401);

    // 3) Worker 側の secret 未設定 -> 401 (fail-closed)
    const resUnset = await worker.fetch(
        new Request("https://userid-names.geten777.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Worker-Key": "worker-secret-xyz" },
            body: payload,
        }),
        { DB: mockDb }
    );
    assert.equal(resUnset.status, 401);

    // 4) 正しい X-Worker-Key -> 200
    const resOk = await worker.fetch(
        new Request("https://userid-names.geten777.workers.dev/", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Worker-Key": "worker-secret-xyz" },
            body: payload,
        }),
        { DB: mockDb, CF_WORKER_KEY: "worker-secret-xyz" }
    );
    assert.equal(resOk.status, 200);
    const bodyOk = await resOk.json();
    assert.deepEqual(bodyOk, { success: true, count: 1 });

    // 5) GET get_names は合言葉なしで 200
    const resGet = await worker.fetch(
        new Request("https://userid-names.geten777.workers.dev/?action=get_names&uid=100", {
            method: "GET",
        }),
        { DB: mockDb, CF_WORKER_KEY: "worker-secret-xyz" }
    );
    assert.equal(resGet.status, 200);
});
