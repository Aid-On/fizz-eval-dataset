// dataset-driver.js — eval-set ローダのグルー例。
// 行検証 + スキーマ = Almide(wasm)、TSV 読み込み・分割 = host(line.split("\t"))。
export async function loadEvalDataset(wasmUrl) {
  const bytes = await (await fetch(wasmUrl)).arrayBuffer();
  const mod = await WebAssembly.compile(bytes);
  const imports = {}; for (const i of WebAssembly.Module.imports(mod)) (imports[i.module] ??= {})[i.name] = () => 0;
  const { exports: ex } = await WebAssembly.instantiate(mod, imports); try { ex._start(); } catch {}
  const enc = new TextEncoder(), dec = new TextDecoder();
  const setLine = (s) => { const b = enc.encode(s); const p = ex.in_alloc(b.length); new Uint8Array(ex.memory.buffer, Number(p), b.length).set(b); };
  const colName = (i) => dec.decode(new Uint8Array(ex.memory.buffer, Number(ex.out_ptr()), Number(ex.column_name_resolve(i))));
  return {
    columnCount() { return ex.column_count(); },
    columnName(idx) { return colName(idx); },
    fieldCount(line) { setLine(line); return ex.field_count(); },
    isHeader(line) { setLine(line); return ex.is_header() === 1; },
    isValidRow(line) { setLine(line); return ex.is_valid_row() === 1; },
    // TSV 全体 → 有効データ行を {comment, reply, user, timestamp, category, note} で返す。
    parse(tsv) {
      const rows = [];
      for (const line of tsv.split("\n")) {
        const l = line.replace(/\r$/, "");
        if (!this.isValidRow(l)) continue;
        const [comment, reply, user, timestamp, category, note] = l.split("\t");
        rows.push({ comment, reply, user, timestamp, category, note });
      }
      return rows;
    },
  };
}
