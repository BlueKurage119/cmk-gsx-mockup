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
  - **レスポンス**: HTMLページ (Content-Type: `text/html; charset=utf-8`)
  - **ブラウザー確認**: Google Cloud Console 調（マテリアルデザイン）のダッシュボード画面です。青ヘッダー（タイトル「概況（東地区）」、リアルタイム時計、端末名）、左側 Navigation Rail（「概況(東)」「設備入力」「警報一覧」）、上部操作ツールバー（「開放」「閉鎖」「制限」「送信」「取消」ボタン）、ダークテーマのマップ表示領域（東展示棟マップ、ホール名8件、地名4件、設備アイコン・ラベル30件、状態色: 開=緑 / 閉=赤 / 制限=オレンジ）、下部通知領域（3ステップの操作ガイダンスメッセージと応答ボタン）が表示されます。設備アイコンをクリックすると選択ハイライトが表示され、ツールバーから状態を選択できます。
- **M端末（現場用）**: `http://localhost:8080/m`
  - **レスポンス**: HTMLページ (Content-Type: `text/html; charset=utf-8`)
  - **ブラウザー確認**: スマートフォン（375px〜428px）に最適化された現場警備用モバイル画面（概況表示）です。上部ヘッダー（画面名称「概況表示」、端末名バッジ「東地区外警1」）、中央メインエリア（上段: 地図プレビューカード「タップで拡大」、下段: 現場運用サマリー「開放中ゲート・制限運用中ゲート・閉鎖中ゲートの一覧」）、下部ボトムナビゲーションバー（「概況表示」「設備入力」「非常通報」「故障申告」の4項目）が表示されます。地図プレビューをタップすると全画面マップ拡大モーダルが開き、ピンチ/ホイールズームおよびドラッグ移動による詳細確認が可能です。横スクロールが発生せず、スマートフォン全画面にすっきり収まる設計です。
- **設備一覧 API**: `http://localhost:8080/api/facilities`
  - **レスポンス**: 設備30件（ゲート7・シャッター22・定点1）の JSON 配列 (Content-Type: `application/json; charset=utf-8`)
  - **状態管理**: 設備状態はサーバープロセスのメモリ上に保持され、サーバー再起動時に初期状態へリセットされます。
- **設備状態更新 API**: `PUT http://localhost:8080/api/facilities/:id`
  - **リクエスト**: `{"state": "open" | "closed" | "restricted"}` (Content-Type: `application/json`)
  - **レスポンス**: 更新後の設備オブジェクト (Content-Type: `application/json; charset=utf-8`)
- **東展示棟マップ SVG**: `http://localhost:8080/shared/map-east.svg`
  - **レスポンス**: SVG画像ファイル (Content-Type: `image/svg+xml`)
- **設備座標確認マップ**: `http://localhost:8080/shared/facility-map-check.html`
  - **レスポンス**: 座標確認用HTMLページ (Content-Type: `text/html; charset=utf-8`)
  - **ブラウザー確認**: ブラウザで開くとマップ上に設備アイコン29件（ゲート・シャッター）とラベル30件、ホール名8件（東1H〜東8H）、地名4件（ガレリア・リンクスペース・東ターミナル・東棟屋外駐車場）が重ねて描画され、下部に属性値一覧テーブルが表示されます。

```bash
curl -i http://localhost:8080/
curl -i http://localhost:8080/h
curl -i http://localhost:8080/m
curl -i http://localhost:8080/api/facilities
curl -i -X PUT http://localhost:8080/api/facilities/higashi2-gate -H "Content-Type: application/json" -d '{"state":"closed"}'
curl -i http://localhost:8080/shared/map-east.svg
curl -i http://localhost:8080/shared/facility-map-check.html
```

## テスト手順

Node.js 組み込みテストランナーによる自動テストを実行します。

```bash
npm test
```

## デモ操作手順（H端末単体デモ）

C108反省会等における実演デモ用の推奨操作シナリオです。

1. **画面の起動**:
   - ブラウザで `http://localhost:8080/h`（またはデプロイ先URLの `/h`）を開きます。
   - 初期状態では「東1ゲート」のみが緑色（開放）、それ以外の29設備は赤色（閉鎖）で表示されます。
2. **ゲートの開放操作**:
   - マップ上の「**東2ゲート**」をクリックします。
   - アイコン周囲に青い選択リングが表示され、下部通知領域に「`東2ゲート: 状態を選択してください`」と表示されます。
   - 上部ツールバーの「**開放**」ボタンをクリックします（下部が「`東2ゲート／開放: 送信をクリックして変更を反映させてください`」に変化）。
   - 「**送信**」ボタンをクリックします。
   - アイコンが即座に緑色（`#34A853`）に変わり、通知領域が3秒間緑調背景で「`東2ゲート: 状態を「開放」に変更しました`」と表示されます。
3. **シャッターの制限操作**:
   - マップ上の「**東1-A**」（シャッター）をクリックします。
   - 上部ツールバーの「**制限**」ボタンをクリック → 「**送信**」をクリックします。
   - アイコンが即座に黄色（`#FBBC04`）に変わります。
4. **永続性の確認**:
   - ブラウザをリロード（F5）しても、変更した状態（東2ゲート: 開放、東1-A: 制限）がそのまま維持されていることを確認できます。

## Cloud Run デプロイ

本リポジトリには Google Cloud Run デプロイ用の `Dockerfile`、`.dockerignore`、`.gcloudignore` が含まれています。
詳細なデプロイ手順、ローカル検証、および撤去手順については [Google Cloud Run デプロイ手順書](../docs/cloud-run-deployment.md) を参照してください。

## ディレクトリ構成

- `server.js`: Express サーバー本体およびエントリーポイント
- `Dockerfile`: Google Cloud Run 用コンテナイメージ定義
- `.dockerignore`: Docker ビルドコンテキスト除外設定
- `.gcloudignore`: Cloud Build ソースアップロード除外設定
- `test/`: 自動テストコード
- `src/routes/`: ルーティング実装配置先（端末画面、設備 API、共有アセット等）
- `src/state/`: 設備状態モデルおよび初期値配置先
- `public/h/`: H端末静的ファイル配置先
- `public/m/`: M端末静的ファイル配置先
- `public/shared/`: 共有静的ファイル配置先（マップSVG、設備座標確認HTML等）
