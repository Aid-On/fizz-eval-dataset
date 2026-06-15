import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/ds.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
const enc = new TextEncoder(), dec = new TextDecoder();
const setLine = (s) => { const b = enc.encode(s); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
const readOut = (len) => dec.decode(new Uint8Array(ex.memory.buffer, Number(ex.out_ptr()), Number(len)));
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

ck(ex.column_count() === 6, "column_count");
ck(ex.col_comment() === 0 && ex.col_reply() === 1, "key columns");
ck(readOut(ex.column_name_resolve(0)) === "comment", "col 0 name");
ck(readOut(ex.column_name_resolve(5)) === "note", "col 5 name");

setLine("今日の新衣装\t[happy] ありがとう\t太郎\t15:30\t感想\t");
ck(ex.row_kind() === 1, "example kind");
ck(ex.is_example_row() === 1 && ex.is_valid_row() === 1, "example valid");
ck(readOut(ex.comment_resolve()) === "今日の新衣装", "example comment");
ck(readOut(ex.reply_resolve()) === "[happy] ありがとう", "example reply");

// monologue 行(Q 空 / A あり)← 旧実装が誤って弾いていた行
setLine("\t[relaxed] 真面目な話していい?\t\t\t雑談\t");
ck(ex.row_kind() === 2, "monologue kind");
ck(ex.is_monologue_row() === 1 && ex.is_valid_row() === 1, "monologue valid (kept)");
ck(ex.has_comment() === 0 && ex.has_reply() === 1, "monologue: no Q, has A");

// A 空 → 無効
setLine("コメントだけ\t\t太郎\t10:00\t雑談\t");
ck(ex.row_kind() === 0 && ex.is_valid_row() === 0, "no-reply invalid");

setLine("拾ったコメント\tラムネの回答\tユーザー名\tタイムスタンプ\tカテゴリ\t備考");
ck(ex.is_header() === 1 && ex.row_kind() === 0, "header invalid");

// 多重読み: 同じ行で row_kind を複数回 + reply_resolve を挟んでも g_in 健在 (almide#690)
setLine("c1\tr1\tu1\t10:00\t雑談\t");
ck(ex.row_kind() === 1 && ex.row_kind() === 1, "multi-read kind");
ex.reply_resolve();
ck(ex.row_kind() === 1, "kind after reply_resolve (g_in intact)");

console.log(ok ? "wasm OK — TSV schema + example/monologue classification matches native" : "FAIL"); if (!ok) process.exit(1);
