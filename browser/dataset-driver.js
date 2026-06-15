// dataset-driver.js — eval-set ローダのグルー例。
// 行分類 + スキーマ = Almide(wasm)、TSV 読み込み・分割 = host(line.split("\t"))。
// persona.ts::parseExamplesTsv と同じく example(Q/A)と monologue(独り言)に振り分ける。
export async function loadEvalDataset(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const enc = new TextEncoder(), dec = new TextDecoder();
  const setLine = (s) => { const b = enc.encode(s); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
  const readOut = (len) => dec.decode(new Uint8Array(ex.memory.buffer, Number(ex.out_ptr()), Number(len)));
  return {
    columnCount() { return ex.column_count(); },
    columnName(idx) { setLine(""); return readOut(ex.column_name_resolve(idx)); },
    // 行種別: 1 = example, 2 = monologue, 0 = 無効。
    rowKind(line) { setLine(line); return ex.row_kind(); },
    isValidRow(line) { setLine(line); return ex.is_valid_row() === 1; },
    comment(line) { setLine(line); return readOut(ex.comment_resolve()); },
    reply(line) { setLine(line); return readOut(ex.reply_resolve()); },
    // TSV 全体 → { examples: [{comment, reply}], monologues: [reply] }。
    // persona.ts::parseExamplesTsv と同じ振り分け(Q/A → example, Q空/A → monologue)。
    parse(tsv) {
      const examples = [], monologues = [];
      for (const line of tsv.split("\n")) {
        const l = line.replace(/\r$/, "");
        setLine(l);
        const kind = ex.row_kind();
        if (kind === 1) examples.push({ comment: readOut(ex.comment_resolve()), reply: readOut(ex.reply_resolve()) });
        else if (kind === 2) monologues.push(readOut(ex.reply_resolve()));
      }
      return { examples, monologues };
    },
  };
}
