# Windows向け Codex Ares

<p align="center">
  <img src="docs/assets/ares-banner.svg" alt="Codex Ares — AstraとSolの推論強度を自動調整" width="1120" />
</p>

**モデルを選ぶ。推論の強さはAresに任せる。**

ファイルの確認、不具合の調査、実装方針の検討。次の作業に必要な思考量は、その都度変わります。Aresは生成の直前に状況を評価し、選択したモデルが次の応答で使う推論強度を調整します。作業は同じ会話の中で続きます。

<p align="center">
  <a href="README.md">English</a> · <a href="README.ko.md">한국어</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml"><img src="https://github.com/M-T-D-N/codex-ares-windows/actions/workflows/test.yml/badge.svg" alt="Source checks" /></a>
  <a href="docs/build.md"><img src="https://img.shields.io/badge/status-source_preview-d89a44" alt="Source preview" /></a>
  <a href="docs/compatibility.md"><img src="https://img.shields.io/badge/platform-Windows_x64-286b85" alt="Windows x64" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT_%2B_Apache--2.0-447a64" alt="MIT adapter + Apache-2.0 native patch" /></a>
</p>

<p align="center">
  <a href="#使い始める">使い始める</a> · <a href="#評価経路を選ぶ">評価経路を選ぶ</a> · <a href="docs/architecture.md">仕組み</a> · <a href="docs/pilot-results.md">試験結果</a>
</p>

> [!NOTE]
> **ソースプレビュー:** 固定された依存関係を使ってローカルでビルドします。開始前に[ビルドガイド](docs/build.md)、[互換性](docs/compatibility.md)、[開発検証](docs/validation.md)をご確認ください。

開発について：この派生版はAIが生成し、ユーザーが動作を試験しています。[開発に関する開示](#ai開発に関する開示)をご覧ください。

## Codexに加わる機能

- **作業中の推論強度を自動で切り替え。** 最初の生成から次のステップを評価し、`medium`、`high`、`xhigh`、`max`を選べます。ステップごとに作業を止めて設定を変える手間を減らします。
- **選んだモデルが、そのまま作業を継続。** AstraはAstra、SolはSol、Sol 6.1はSol 6.1のままです。強度の変更は同じターンの次の生成に適用され、既存のワーカーもそれぞれの役割を維持します。
- **評価が遅れても作業を継続。** 評価がタイムアウトした場合や評価器を利用できない場合は、メインが基準の強度で処理を続け、制御側が復旧を扱います。

通常のAstra・Sol・Sol 6.1・Lunaも引き続き選べます。自動制御はAresの経路を選んだときに始まります。

## 評価経路を選ぶ

| Codexでの選択名 | 作業するモデル | 強度を判断するモデル |
|---|---|---|
| **Astra Ares** | GPT-6 Astra | 独立したGPT-6 Luna / High |
| **Sol Ares** | GPT-6 Sol | 独立したGPT-6 Luna / High |
| **Sol 6.1-Ares** | GPT-6.1 Sol | 独立したGPT-6 Luna / High |

**Lunaが評価し、メインが作業します。** Luna経路は既存のCodexログインを利用します。独立した評価器がツールやMCPを使わず、現在の判断に必要な文脈を読み、推論強度を提案します。


## 使い始める

必要なものは、**Windows x64**、Node.js 22+とnpm、Git、rustup、Visual Studioのx64 C++ビルドツール、対応するCodex Desktopです。現在のnativeソースは**Codex 0.160.0**が基準です。既存のローカルAres実行環境でDesktop起動とLuna判断→メイン応答を確認しました。[互換性](docs/compatibility.md)で検証範囲を確認してください。

```powershell
git clone https://github.com/M-T-D-N/codex-ares-windows.git
Set-Location codex-ares-windows
npm run setup
```

セットアップは固定されたソースと依存関係を取得し、nativeパッチを適用してPC上でAresをビルドします。V8のダウンロードを検証し、再利用できるビルドキャッシュをプロジェクト内に保持します。インストール済みのCodex、認証情報、標準のRust toolchainは変更しません。

ビルド後、進行中のローカル作業を終え、アプリメニューからCodexを通常終了してください。管理者権限ではないPowerShellでAresを起動します。

```powershell
.\scripts\start.ps1
```

モデル選択で**Astra Ares**、**Sol Ares**または**Sol 6.1-Ares**を選ぶと、Luna評価を利用できます。

| 操作 | 方法 |
|---|---|
| 実行中のbackendと制御状態を確認 | `.\scripts\status.ps1`を実行 |
| 固定の推論強度に戻る | ターン終了後に通常のモデルを選択 |
| 現在の作業を止める | Codex標準のStopを使用 |
| インストール済みアプリに戻る | 通常終了し、いつもどおりCodexを起動 |

[詳しいビルド手順と失敗後の再開方法](docs/build.md)

## 実際のCodex作業で確認

既存の試験では、4つの経路、同一ターン内の強度変更、複数会話の並行実行、評価の遅延後の復旧を確認しました。[公開した試験結果](docs/pilot-results.md)には、業務12条件の全比較とJevの判断51件の分析を掲載しています。

<details>
<summary><strong>結果と現在の推奨</strong></summary>

- **Astra：** 評価の待ち時間を許容できるならLuna評価を選べます。遅延を重視する場合は固定のAstra/xhighがシンプルです。
- **Sol：** 測定した業務では固定のSol/Highを標準として推奨します。
- **過去のJev試験：** 51件すべてがメインに委ねられました。Jev経路は削除し、当時の測定結果は試験報告に残しています。

この小規模比較は制御動作の根拠であり、一般的なコスト削減や品質向上を証明するものではありません。失敗、未観測の項目、自然な強度引き上げと明示的な制御試験の違いも結果に含めています。

</details>

現在の配布形式は**PCでビルドするソース**です。最近の修正は、起動元の終了後も評価接続を保ち、現在の要求を残して長い評価入力を縮小し、開発ビルドで中断されたツール履歴を復旧します。実際のSol 6.1-AresターンはLuna/HighのMedium推奨を適用して完了しました。[開発検証](docs/validation.md)ではローカル実行と公開用の構成検査を分け、遅延と失敗も記録します。

## 詳しく見る

[構成](docs/architecture.md) · [ビルドと依存関係](docs/build.md) · [互換性](docs/compatibility.md) · [プライバシー](docs/privacy.md) · [試験結果](docs/pilot-results.md)

READMEは英語・韓国語・日本語・簡体字中国語で提供しています。詳細な技術文書は現在英語です。

## AI開発に関する開示

この派生版の変更の大部分は、ユーザーが提示した要件と、その後の確認・修正依頼に基づき、OpenAI Codexが生成・修正しました。リポジトリの所有者はソースコードを手作業でレビューしていません。検証は、所有者のWindows/Codex環境での自動テストと実際の機能試験に基づいています。独立した第三者によるコードレビューやセキュリティ監査は実施されていません。

**要約：** AIが生成し、ユーザーが試験。手作業によるコードレビューは未実施です。

## Upstreamとライセンス

[Astra-Ares](https://github.com/miuuyy/Astra-Ares)から派生したアダプターで、[OpenAI Codex](https://github.com/openai/codex)を修正します。正確なソース情報は[lock](patches/codex/upstream.lock.json)に記録しています。OpenAIの公式製品ではなく、upstreamによるサポートを約束するものでもありません。

[ライセンス](LICENSE)はbridgeと新規アダプターのMIT、native変更のApache-2.0を維持します。[第三者に関する通知](THIRD_PARTY_NOTICES.md)に元の条件を保存しています。インストール済みDesktopや実行ファイルの依存関係は、このソース配布に含めません。
