# UI 靈感庫

收藏網路上看到的 UI 樣式，拆成可重用的規格，一頁管理。純前端靜態頁。

- 範例庫式版面：範例卡片牆 + 單款示範頁（網址用 `#bn-02` 這種錨點），每款有自己的色相（條目可加 `hue` 0–359 指定，否則由 id 推算）
- 手機：單欄卡片，分類是橫向捲動列；900px 以上：左側固定分類欄、卡片多欄、示範頁左右兩欄（右側預覽固定）
- 頂部：狀態篩選（全部／星號／想用／已用）、搜尋、同步狀態（點了開同步設定）
- 有預覽的樣式可直接操作；卡片上示範以外的地方點了進示範頁
- 條目與分類表由 Claude 直接寫進資料 repo，網頁上沒有新增功能，只能標星號、改狀態、寫備註、編輯、刪除
- 分類兩層：大類（導覽／頁面／內容／輸入／回饋／風格）› 類別（底部選單、儀表板…），定義在資料檔的 `categories`
- 同步採合併：分類表與條目內容以遠端為準，裝置端改過的星號、狀態、備註會保留，不會蓋掉 Claude 新加的條目
- 可加到手機主畫面（manifest ＋ apple-touch-icon）；沒有 service worker，不會有舊版快取問題
- 儲存：localStorage ＋ GitHub Contents API 同步（「同步設定」填 owner / repo / 分支 / 路徑 / token）
- Token：Fine-grained PAT，只勾 private repo `ui-library-data`、Contents: Read and write；只存在裝置瀏覽器，不進 repo
- 沒設定同步時，第一次開啟會載入 `entries.default.json` 的基本條目
- 資料格式：`{ "categories": [ { group, name, code } ], "entries": [ { id, code, category, name, en, desc, spec, tags[], status, star, note, source, preview, hue, addedAt } ] }`
- `preview` 對應 `app.js` 的 `PREVIEWS`（bn-01 到 bn-11）或 `previewHTML` 裡的專屬示範（db-01；bg-01 到 bg-06 的背景效果由 `bgHTML`／`bgTap` 處理）；新的可操作預覽要同時加 `PREVIEWS` 與 `style.css` 的樣式
- 改版時 `index.html` 的 `?v=N` 要一起改號
- 版面用 `100dvh`，不用 `vh`；表單一律 16px（iOS 聚焦不放大）

## 部署

GitHub Pages：Settings → Pages → Deploy from a branch → `main` / root。push 到 `main` 即更新。

## 動態效果

參考 Motion Prompt（MIT, © Shohei Ohtaki）的規格重寫為 CSS：#057 Tabs、#001 Pop-in、#002 Stagger、#085 Ripple。

## 設計

版面結構參考 motion.dev 的範例庫（卡片牆 + 單款頁、等寬小字標籤、髮線分隔），配色與識別為自訂。
