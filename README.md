# fizz-eval-dataset

コメント/返答**評価セット TSV のスキーマ + 行検証**。Almide 1 コアを native + wasm へ。
openaituber `eval/ramune-fullset.tsv` の形式(タブ区切り 6 列 + ヘッダ行)を切り出した
単一責任部品(§12 評価系)。

TSV の読み込み・行分割は Node の I/O(`line.split("\t")`)、**何列か・各列は何か・
この行を example / monologue / 無効 のどれに振り分けるか**という契約は純粋なのでここに集約。
分類規則は openaituber `src/chat/persona.ts::parseExamplesTsv` と一致させてある。

## スキーマ(6 列)

| idx | 列名 | 内容 |
|---:|---|---|
| 0 | comment | 拾ったコメント(コア) |
| 1 | reply | 返答(コア) |
| 2 | user | ユーザー名 |
| 3 | timestamp | タイムスタンプ |
| 4 | category | カテゴリ |
| 5 | note | 備考 |

## 行分類(persona.ts と一致)

| 条件 | 種別 | `row_kind` |
|---|---|---:|
| Q も A もある | example(few-shot Q/A) | 1 |
| Q が空 / A がある | monologue(コメント無しの独り言) | 2 |
| A が空 / ヘッダ / 空行 / 列数不正 | 無効(捨てる) | 0 |

## API

`column_count()` = 6 / `column_name(idx)` / `col_comment()` = 0 / `col_reply()` = 1 /
`field_count(line)` / `has_valid_columns(line)` / `is_header(line)` / `is_blank(line)` /
`comment_of(line)` / `reply_of(line)`(trim 済み)/ `has_comment(line)` / `has_reply(line)` /
`is_example_row(line)` / `is_monologue_row(line)` / `is_valid_row(line)`(= example か monologue)/
`row_kind(line)`。

## wasm 境界

行文字列は `in_alloc` バッファ + `from_list(to_list)` コピー経由で渡す(almide#690 回避)。
分類は Int/Bool→Float、列名・Q/A 列の文字列出力は `out_ptr` で読む。
例: [`browser/dataset-driver.js`](browser/dataset-driver.js)。

実 eval-set(`ramune-fullset.tsv`)で wasm の分類が `persona.ts::parseExamplesTsv` と
完全一致(**examples 80 / monologues 29 / mismatch 0**)を確認済み。

## ビルド / テスト

```sh
almide test spec/eval_dataset_test.almd
almide build src/main.almd -o build/fizz-eval-dataset
almide build src/bridge.almd --target wasm -o build/ds.wasm
node test/wasm-smoke.mjs
```

Almide v0.27.7 で native / wasm とも green。
