# UI 靈感庫

收藏網路上看到的 UI 樣式，拆成可重用的規格，一頁管理。純前端靜態頁。

- 展櫃式版面：一款一屏、上下滑動；每款有自己的色相（條目可加 `hue` 0–359 指定，否則由 id 推算）
- 底部懸浮選單：全部（索引）、搜尋、新增、星號、篩選（含同步設定）
- 有預覽的樣式可直接操作；星號、狀態（收藏／想用／已用）、備註、新增／編輯／刪除
- 可加到手機主畫面（manifest ＋ apple-touch-icon）；沒有 service worker，不會有舊版快取問題
- 儲存：localStorage ＋ GitHub Contents API 同步（「同步設定」填 owner / repo / 分支 / 路徑 / token）
- Token：Fine-grained PAT，只勾 private repo `ui-library-data`、Contents: Read and write；只存在裝置瀏覽器，不進 repo
- 沒設定同步時，第一次開啟會載入 `entries.default.json` 的基本條目
- 資料格式：`{ "entries": [ { id, code, category, name, en, desc, spec, tags[], status, star, note, source, preview, addedAt } ] }`
- `preview` 對應 `app.js` 的 `PREVIEWS`（目前有 bn-01 到 bn-11）；新的可操作預覽要同時加 `PREVIEWS` 與 `style.css` 的樣式
- 改版時 `index.html` 的 `?v=N` 要一起改號
- 版面用 `100dvh`，不用 `vh`；表單一律 16px（iOS 聚焦不放大）

## 部署

GitHub Pages：Settings → Pages → Deploy from a branch → `main` / root。push 到 `main` 即更新。

## 動態效果

參考 Motion Prompt（MIT, © Shohei Ohtaki）的規格重寫為 CSS：#057 Tabs、#001 Pop-in、#002 Stagger、#085 Ripple。

## 設計

方向取自三選一初稿中的「展櫃」，流程參考 huashu-design（MIT, © 花叔）。
