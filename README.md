# Link Aggregation Tool | 網頁連結集結工具

這是一個簡單而強大的工具，用於收集和展示網頁連結。它會自動擷取貼上網址的元數據（標題、圖標、簡介），並以精美的卡片形式展示。

## 功能特色
- 🔗 **自動擷取元數據**：貼上網址，自動抓取標題、描述和縮圖。
- 📝 **連結備註與提醒**：可為連結添加備註，並在卡片上醒目顯示。
- 🤖 **智慧公告整合**：備註中若包含日期，將自動同步至公告欄並附上快速跳轉連結。
- 🎨 **現代化介面**：使用 Glassmorphism 設計風格，支援響應式佈局。
- 💾 **資料持久化**：連結資料儲存在後端 JSON 檔案中，重啟不丟失。
- ⚡ **快速部署**：支援 Docker 和 GitHub Actions 自動化部署。

## 專案結構
```
.
├── app.py              # Flask 後端主程式
├── requirements.txt    # Python 套件依賴
├── Dockerfile          # Docker 映像檔設定
├── .gitignore          # Git 忽略清單
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Action 部署腳本
├── static/
│   ├── style.css       # 前端樣式
│   └── script.js       # 前端互動腳本
├── templates/
│   └── index.html      # 前端頁面
└── user_manual.md      # 使用者說明書
```

## 本地開發 (Local Development)

### 先決條件
- Python 3.8+
- pip

### 安裝步驟

1. Clone 專案或下載程式碼。
2. 安裝依賴套件：
   ```bash
   pip install -r requirements.txt
   ```

### 啟動服務

執行以下指令啟動 Flask 伺服器：
```bash
python app.py
```

伺服器啟動後，請在瀏覽器開啟：`http://localhost:5000`

## 部署 (Deployment)

本專案包含 `Dockerfile` 和 GitHub Action 設定，方便部署到雲端服務。

### Docker 部署
1. 建置映像檔：
   ```bash
   docker build -t link-aggr .
   ```
2. 執行容器：
   ```bash
   docker run -p 5000:5000 link-aggr
   ```

### GitHub Action
`deploy.yml` 設定了自動建置 Docker Image 的流程。你需要：
1. 在 GitHub Repository 的 Settings > Secrets and variables > Actions 中設定：
   - `DOCKER_USERNAME`: Docker Hub 帳號
   - `DOCKER_PASSWORD`: Docker Hub Access Token
2. Push 程式碼到 `main` 分支即可觸發自動建置。

## 技術棧
- **Backend**: Python, Flask, BeautifulSoup4 (Scraping)
- **Frontend**: HTML5, CSS3 (Vanilla), JavaScript (Vanilla)
- **Infrastructure**: Docker, GitHub Actions

---
*Created by Antigravity*
