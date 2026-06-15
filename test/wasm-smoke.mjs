import { readFileSync } from "node:fs";
const mod = await WebAssembly.compile(readFileSync(new URL("../build/ds.wasm", import.meta.url)));
const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
const enc = new TextEncoder(), dec = new TextDecoder();
const setLine = (s) => { const b = enc.encode(s); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
const colName = (i) => { const len = ex.column_name_resolve(i); const p = ex.out_ptr(); return dec.decode(new Uint8Array(ex.memory.buffer, Number(p), Number(len))); };
let ok = true; const ck = (c, m) => { if (!c) { console.error("FAIL " + m); ok = false; } };

ck(ex.column_count() === 6, "column_count");
ck(ex.col_comment() === 0 && ex.col_reply() === 1, "key columns");
ck(colName(0) === "comment", "col 0: " + colName(0));
ck(colName(5) === "note", "col 5");
ck(colName(9) === "", "col oob");

setLine("今日の新衣装\t[happy] ありがとう\t田中太郎\t15:30\t感想\t");
ck(ex.field_count() === 6, "good fields");
ck(ex.has_valid_columns() === 1, "good cols");
ck(ex.is_valid_row() === 1, "good valid");
ck(ex.is_header() === 0, "good not header");

setLine("拾ったコメント\tラムネの回答\tユーザー名\tタイムスタンプ\tカテゴリ\t備考");
ck(ex.is_header() === 1, "header detect");
ck(ex.is_valid_row() === 0, "header not valid row");

setLine("a\tb");
ck(ex.has_valid_columns() === 0 && ex.is_valid_row() === 0, "short row");

setLine("   ");
ck(ex.is_blank() === 1 && ex.is_valid_row() === 0, "blank");

// 多重読み: 同じ行で is_valid_row を複数回 + column_name を挟んでも g_in 健在 (almide#690)
setLine("c1\tr1\tu1\t10:00\t雑談\t");
ck(ex.is_valid_row() === 1 && ex.is_valid_row() === 1, "multi-read valid");
ex.column_name_resolve(0);
ck(ex.is_valid_row() === 1, "valid after column_name (g_in intact)");

console.log(ok ? "wasm OK — TSV schema + row validation matches native" : "FAIL"); if (!ok) process.exit(1);
