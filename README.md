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
- 沒設定同步的裝置，每次開啟都會把 `entries.default.json`（內建資料）合進來：補上新條目與分類，保留這台改過的星號、狀態、備註。這個檔是資料 repo `entries.json` 去掉星號、狀態、備註後的公開副本，新增條目後要一起更新
- 資料格式：`{ "categories": [ { group, name, code } ], "entries": [ { id, code, category, name, en, desc, spec, tags[], status, star, note, source, preview, hue, addedAt } ] }`
- `preview` 對應 `app.js` 的 `PREVIEWS`（bn-01 到 bn-11）或 `previewHTML` 裡的專屬示範（db-01；bg-01 到 bg-06 的背景效果由 `bgHTML`／`bgTap` 處理；nt-01 到 nt-06 的通知動效由 `ntHTML`／`NT_PLAY` 處理，看得到時自動播；mo-01 由 `moHTML` 處理；sw-01 到 sw-06 的下拉選單展開由 `swHTML`／`SW_FX` 處理，看得到時自動示範；cd-01 的三檢視卡片展示獨立在 `cd01.js`（`cdHTML`／`initCds`，自己處理點擊與拖曳，14 張卡片的小動效畫在 canvas 上，沒人操作時自動輪播）；mo-02 到 mo-15 是同一批小動效各自獨立的示範（`cdFxHTML`／`initCdFx`，點一下切換疏密））
- lp-01 的捷運路線導覽獨立在 `lp01.js`（`lpHTML`／`initLps`）：地圖、路線、三節列車用 canvas 自己做透視投影，頂部列、到站卡片、總結卡是 DOM（720×900 圖層整層縮放）；時間表 `LP_SCHED` 循環播放，看得到時才畫，點一下跳到下一段
- ic-01 到 ic-06 的會動小圖示（每款 6 個，共 36 個）由 `icHTML` 加 style.css 的 `k-*` 動畫處理，純 SVG＋CSS，點一下重播
- ui-01 到 ui-12 的介面風格示範獨立在 `ui12.js`（`uiHTML`／`uiTap`）：同一組元件（數字與圖表、分段切換、開關、環圈、待辦、按鈕、加減器）共用一份結構，12 種外皮寫在 style.css 的 `.u01`–`.u12`；各款文案與數字在 `UI_C`
- sd-01 的收合按鈕對照獨立在 `sd01.js`（`sdHTML`／`sdTap`／`initSds`）：上面的視窗收起後按鈕換位置，會量出游標要移動的實際距離並畫箭頭；下面的視窗按鈕固定在左上角。沒人操作時由假游標自動示範，點過之後停 9 秒再接手；外觀在 style.css 的 `.sdx`
- 所有底部選單示範的選中指示器都由 `place()` 的雙彈簧驅動（前緣 ω₀ 19／ζ 0.55、後緣 ω₀ 11／ζ 0.72，即 MO-01），不用 CSS transition；新的可操作預覽要同時加 `PREVIEWS` 與 `style.css` 的樣式
- 改版時 `index.html` 的 `?v=N` 要一起改號
- 版面用 `100dvh`，不用 `vh`；表單一律 16px（iOS 聚焦不放大）

## 部署

GitHub Pages：Settings → Pages → Deploy from a branch → `main` / root。push 到 `main` 即更新。

## 動態效果

參考 Motion Prompt（MIT, © Shohei Ohtaki）的規格重寫為 CSS：#057 Tabs、#001 Pop-in、#002 Stagger、#085 Ripple。

## 設計

版面結構參考 motion.dev 的範例庫（卡片牆 + 單款頁、等寬小字標籤、髮線分隔），配色與識別為自訂。
