# 戦国将棋

ごろごろどうぶつしょうぎ (5×6 盤) のルールを土台にした、子ども・家族向けの戦国武将将棋。
同じ端末で2人対戦する。仕様は [docs/requirements.md](docs/requirements.md)。

## 動かし方

```bash
npm install
npm run dev
```

| コマンド | 内容 |
|---|---|
| `npm run dev` | 開発サーバー (http://localhost:5173) |
| `npm test` | ゲームエンジンのテスト |
| `npm run build` | 型チェックと本番ビルド (`dist/`、静的ホスティングでそのまま配布できる) |

## 構成

- `src/engine/` ルール (合法手・成り・打ち駒・寝返り・必殺技・勝敗・千日手)。UI に依存しない純粋関数
- `src/data/families.ts` 大名家・武将名・必殺技・色
- `src/ui/` 画面 (タイトル・大名選択・合戦・結果) とキャラクター SVG
- `src/audio/sound.ts` 効果音 (Web Audio で合成。音声ファイル不要)

画面は高さ 800 (スマホの横向きは 560) で設計し、横幅は端末の縦横比に合わせて広げてから、ウィンドウに合わせて拡大縮小する (src/ui/Stage.tsx)。
スマホは横向き固定で、縦向きのときは「よこに してね」と表示する。
