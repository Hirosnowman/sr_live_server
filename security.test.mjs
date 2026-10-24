// 入力検査と許可リストの単体テスト（node --test security.test.mjs）。
// サーバーは起動しない。悪い入力は実サーバーに送らず、検査関数が落とすことだけを確かめる。
import test from "node:test";
import assert from "node:assert/strict";
import { RE_DIGITS, RE_URLKEY, isAllowedHost, parseAllowedUrl } from "./security.mjs";

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
