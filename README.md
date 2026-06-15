# fizz-eval-dataset

コメント/返答**評価セット TSV のスキーマ + 行検証**。Almide 1 コアを native + wasm へ。
openaituber `eval/ramune-fullset.tsv` の形式(タブ区切り 6 列 + ヘッダ行)を切り出した
単一責任部品(§12 評価系)。

TSV の読み込み・行分割・フィールド切り出しは Node の I/O(`line.split("\t")`)、
**何列か・各列は何か・この行は有効か**というスキーマ契約は純粋なのでここに集約。

## スキーマ(6 列)

| idx | 列名 | 内容 |
|---:|---|---|
| 0 | comment | 拾ったコメント(コア) |
| 1 | reply | 返答(コア) |
| 2 | user | ユーザー名 |
| 3 | timestamp | タイムスタンプ |
| 4 | category | カテゴリ |
| 5 | note | 備考 |

## API

`column_count()` = 6 / `column_name(idx)` / `col_comment()` = 0 / `col_reply()` = 1 /
`field_count(line)` / `has_valid_columns(line)` / `is_header(line)` / `is_blank(line)` /
`is_valid_row(line)`(6 列 / ヘッダでない / 空でない / コメント列が空でない)。

## wasm 境界

行文字列は `in_alloc` バッファ + `from_list(to_list)` コピー経由で渡す(almide#690 回避)。
検証は Bool→Float、列名出力は `out_ptr` で読む。例: [`browser/dataset-driver.js`](browser/dataset-driver.js)。

実 eval-set(`ramune-fullset.tsv` 110 行)で wasm の `is_valid_row` 判定が JS リファレンスと
完全一致(valid 80 行、mismatch 0)を確認済み。

## ビルド / テスト

```sh
almide test spec/eval_dataset_test.almd
almide build src/main.almd -o build/fizz-eval-dataset
almide build src/bridge.almd --target wasm -o build/ds.wasm
node test/wasm-smoke.mjs
```

Almide v0.27.7 で native / wasm とも green。
