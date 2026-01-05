# 網頁連結轉運站 (Link Aggregation)

這是一個用於收集並展示重要網頁連結的靜態網站專案。它具備 Python 後端管理模式與 GitHub Pages 靜態部署模式。

## 系統架構

1.  **本地管理 (Local Management)**: 使用 Python (Flask) 啟動一個本地伺服器。
    -   您可以新增、刪除連結與公告。
    -   資料會儲存在 `links.json` 與 `notice.txt` 中。
2.  **靜態生成 (Static Generation)**: 使用 `Frozen-Flask` 將目前的資料與網頁「凍結」成靜態 HTML 檔案。
3.  **自動部署 (Auto Deployment)**: 透過 GitHub Actions，每次上傳程式碼 (Push) 時，會自動執行靜態生成並發布到 GitHub Pages。

## 快速開始

### 1. 安裝環境
請確保您已安裝 Python 3.9+。
```bash
pip install -r requirements.txt
```

### 2. 啟動管理模式 (新增/修改資料)
```bash
python app.py
```
- 開啟瀏覽器訪問 `http://localhost:8000`
- 點擊「編輯者登入」 (預設密碼: `admin`)
- 進行資料新增與編輯

### 3. 發布更新
當您完成資料編輯後，請將變更上傳至 GitHub：
```bash
# 1. 確保已儲存所有變更
git add .
git commit -m "更新連結資料"
git push
```
- GitHub Action 會自動開始建置並部署。
- 等待約 1-2 分鐘，您的 GitHub Pages 網頁就會更新。

## 專案結構
- `app.py`: 本地管理伺服器。
- `build.py`: 靜態網站產生器 (供 GitHub Action 使用)。
- `templates/`: HTML 模板。
- `static/`: CSS 與 JS 檔案。
- `links.json`: 連結資料庫。
- `notice.txt`: 公告資料庫。
