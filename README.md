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
  - **ブラウザー確認**: Google Cloud Console 調（マテリアルデザイン）のダッシュボード画面です。青ヘッダー（タイトル「概況（東地区）」/「設備入力（東地区）」、リアルタイム時計、端末名）、左側 Navigation Rail（「概況(東)」「設備入力」「警報一覧」）による画面切り替えに対応しています。3秒ごとの自動ポーリングにより、設備状態の変更および現場M端末からの状態変更申請がリアルタイムに自動反映されます。
    - **概況(東)画面**: 中央マップ表示領域（東展示棟マップ、ホール名・地名・設備ラベル30件、状態色: 開=緑 / 閉=赤 / 制限=オレンジ）、下部操作ツールバー（色枠線付き「開放」「閉鎖」「制限」ボタン、右端「選択解除」「送信（ブリンク発光）」ボタン）、下部通知領域が表示され、マップクリックによる直感的な単体操作が可能です。
      - **現場申請・故障申告着信通知・ブザー**: 現場M端末から状態変更申請（`status: "pending"`）または設備故障申告（`status: "new"`）が着信すると、ヘッダー背景が濃い青（`#174ea6`）↔白（`#ffffff`）で点滅（視覚警報）し、Web Audio APIによる電子ブザー音（「ビー、ビー、ビー、……」750Hz、400ms発振・900ms周期）が鳴動します。通知領域には承認確認メッセージが表示されます。
      - **オフライン（受信異常）通知**: 通信切断やサーバー障害等でオフライン状態になった際、約3秒間の連続ピー音が鳴動します。
      - **ブザー停止・スヌーズ操作**: ヘッダーバーのクリック、キーボードの `F8` キー押下、または通知領域・モーダル内の各種ボタン（詳細・はい・いいえ・承認・差戻・確認済）を押すことでヘッダー点滅およびブザー音／オフライン音が消音・停止します（緊急サイレン時は2分間スヌーズ）。
      - **マップ上アイコンの現在色↔新色点滅**: H端末では、未承認申請がある設備アイコン（丸・四角）が「現在の状態色」と「申請の希望状態色」の間で1秒ごと（2.0秒周期 step-end）に交互に点滅し続けます。ブザー停止後も申請が確定・取り下げされるまで点滅が維持されるため、現場申請の失念を防止します。
      - **申請内容詳細確認・承認・差戻**: 「詳細」ボタンを押すと「設備状態変更 申請内容」モーダルが表示されます。複数申請がある場合も先頭1件がフラットなプロパティリスト形式ですっきりと表示され、ヘッダー部に「承認待ち: N件」スタックバッジ、フッターに「差戻」「承認」ボタンが備わっています。「承認」または「差戻」を押すと即座に処理され、スタックされた次の申請へ自動的に切り替わります。
    - **設備入力画面**: 全30件の設備台帳テーブル、ホール別・種別・状態別の絞り込みフィルターバー、複数選択チェックボックス（全選択対応）、一括操作ツールバー（「一括開放」「一括閉鎖」「一括制限」「一括送信」）を備え、指揮所からの効率的な一括点検・一括操作が可能です。現場からの未承認申請がある設備には「変更予定」列に「`申請: 〇〇`」バッジ（破線枠・黄色）が自動表示されます。
- **M端末（現場用）**: `http://localhost:8080/m`
  - **レスポンス**: HTMLページ (Content-Type: `text/html; charset=utf-8`)
  - **ブラウザー確認**: スマートフォン（375px〜428px）に最適化された現場警備用モバイル画面です。上部ヘッダー（画面名称「概況表示」/「設備入力（申請）」、端末名バッジ「東地区外警1」）、下部ボトムナビゲーションバー（「概況表示」「設備入力」「非常通報」「故障申告」の4項目）による画面切り替えに対応しています。
    - **概況表示画面**: 中央メインエリア（上段: 地図プレビューカード、右下拡大アイコン、下段: 現場運用サマリー「開放中・制限中ゲートおよび閉鎖中・制限中シャッターの例外一覧」）。地図プレビューをタップすると全画面マップ拡大モーダルが開き、ピンチ/ホイールズームおよびドラッグ移動による詳細確認が可能です。3秒ごとの自動ポーリングにより、最新の設備状態がミニマップ・拡大モーダル・要約ペインへリアルタイムに自動反映されます。
    - **設備入力画面**: エリア・ホール別フィルターチップバー（すべて、東1H〜東8H、外周・共用部）、設備一覧カードリストを表示。各設備の「申請」ボタンから下部スライドアップの申請モーダル（ボトムシート）を開き、希望状態（開放・閉鎖・制限）と備考を入力して指揮所へ申請を送信できます。申請中の設備には「申請中: 〇〇」点滅バッジが表示され、「取消」ボタンから誤送信を取り下げ（キャンセル）可能です。
- **設備一覧 API**: `http://localhost:8080/api/facilities`
  - **レスポンス**: 設備30件（ゲート7・シャッター22・定点1）の JSON 配列 (Content-Type: `application/json; charset=utf-8`)
  - **状態管理**: 設備状態はサーバープロセスのメモリ上に保持され、サーバー再起動時に初期状態へリセットされます。
- **設備状態更新 API（単体）**: `PUT http://localhost:8080/api/facilities/:id`
  - **リクエスト**: `{"state": "open" | "closed" | "restricted"}` (Content-Type: `application/json`)
  - **レスポンス**: 更新後の設備オブジェクト (Content-Type: `application/json; charset=utf-8`)
- **設備状態一括更新 API（一括）**: `PUT http://localhost:8080/api/facilities/batch`
  - **リクエスト**: `{"ids": ["higashi1-a-shutter", "higashi1-b-shutter"], "state": "open" | "closed" | "restricted"}` (Content-Type: `application/json`)
  - **レスポンス**: `{"success": true, "updatedCount": 2, "facilities": [...]}` (Content-Type: `application/json; charset=utf-8`)
- **設備変更申請作成 API**: `POST http://localhost:8080/api/requests`
  - **リクエスト**: `{"facilityId": "higashi2-gate", "requestedState": "open", "note": "開門確認", "applicant": "東地区外警1"}` (Content-Type: `application/json`)
  - **レスポンス**: `201 Created`、作成された申請オブジェクト（`status: "pending"`）
- **設備変更申請一覧取得 API**: `GET http://localhost:8080/api/requests`
  - **クエリ**: `?status=pending` (任意)
  - **レスポンス**: `200 OK`、申請オブジェクトの JSON 配列
- **設備変更申請承認 API**: `POST http://localhost:8080/api/requests/:id/approve`
  - **レスポンス**: `200 OK`、`{"success": true, "request": {"id": "req-1", "status": "approved", ...}, "facility": {...}}`（対象設備の運用状態も希望状態へ即時更新）
- **設備変更申請差戻 API**: `POST http://localhost:8080/api/requests/:id/reject`
  - **レスポンス**: `200 OK`、`{"success": true, "request": {"id": "req-1", "status": "rejected", ...}}`（設備状態は更新されず現状維持）
- **設備変更申請 一括承認 API**: `POST http://localhost:8080/api/requests/batch-approve`
  - **リクエスト**: `{"ids": ["req-1", "req-2"]}`
  - **レスポンス**: `200 OK`、`{"success": true, "approvedCount": 2, "requests": [...], "facilities": [...]}`（対象設備の状態が一括更新）
- **設備変更申請 一括差戻 API**: `POST http://localhost:8080/api/requests/batch-reject`
  - **リクエスト**: `{"ids": ["req-1", "req-2"], "reason": "指揮所による一括差戻"}`
  - **レスポンス**: `200 OK`、`{"success": true, "rejectedCount": 2, "requests": [...]}`
- **設備手動変更時の自動差戻し（競合解消）**:
  - `PUT /api/facilities/:id` または `PUT /api/facilities/batch` で設備を手動更新した際、該当設備に `pending`（保留中）の申請が存在すれば自動的に `status: "rejected"`（`rejectReason: "手動変更により自動差戻し"`）に更新されます。
- **設備変更申請取り下げ API**: `DELETE http://localhost:8080/api/requests/:id`
  - **レスポンス**: `200 OK`、`{"success": true, "request": {"id": "req-1", "status": "cancelled", ...}}`
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
curl -i -X PUT http://localhost:8080/api/facilities/batch -H "Content-Type: application/json" -d '{"ids":["higashi1-a-shutter","higashi1-b-shutter"],"state":"open"}'
curl -i -X POST http://localhost:8080/api/requests -H "Content-Type: application/json" -d '{"facilityId":"higashi2-gate","requestedState":"open","note":"開門確認","applicant":"東地区外警1"}'
curl -i http://localhost:8080/api/requests?status=pending
curl -i -X POST http://localhost:8080/api/requests/req-1/approve
curl -i -X POST http://localhost:8080/api/requests/req-1/reject
curl -i -X POST http://localhost:8080/api/requests/batch-approve -H "Content-Type: application/json" -d '{"ids":["req-1","req-2"]}'
curl -i -X POST http://localhost:8080/api/requests/batch-reject -H "Content-Type: application/json" -d '{"ids":["req-1","req-2"],"reason":"一括差戻"}'
curl -i -X DELETE http://localhost:8080/api/requests/req-1
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
