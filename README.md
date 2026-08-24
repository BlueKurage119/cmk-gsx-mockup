# CMK/GSX Mockup

CMK/GSX PoC 用のモックアップサーバーです。

## 前提条件

- **Node.js**: `>= 20.0.0`
- **npm**: `>= 10.0.0`

## セットアップ手順

依存パッケージ（Express 等）をインストールします。

```bash
npm install
```

## 起動手順

HTTP サーバーを起動します。

```bash
npm start
```

既定ではポート `8080` で起動します。ポートを変更する場合は環境変数 `PORT` を指定します。

```bash
PORT=18080 npm start
```

## 稼働確認

サーバー起動後、ブラウザまたは curl で以下の URL にアクセスして稼働を確認します。

- **サーバー稼働確認**: `http://localhost:8080/`
  - **レスポンス**: `CMK/GSX mockup server is running` (Content-Type: `text/plain; charset=utf-8`)
- **H端末（指揮所用）**: `http://localhost:8080/h`
  - **レスポンス**: `H端末（指揮所用）` (Content-Type: `text/html; charset=utf-8`)
- **M端末（現場用）**: `http://localhost:8080/m`
  - **レスポンス**: `M端末（現場用）` (Content-Type: `text/html; charset=utf-8`)

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/h
curl -i http://localhost:8080/m
```

## テスト手順

Node.js 組み込みテストランナーによる自動テストを実行します。

```bash
npm test
```

## ディレクトリ構成

- `server.js`: Express サーバー本体およびエントリーポイント
- `test/`: 自動テストコード
- `src/routes/`: ルーティング実装配置先
- `src/state/`: 後続 Issue 用状態モデル実装配置先
- `public/h/`: H端末静的ファイル配置先
- `public/m/`: M端末静的ファイル配置先
