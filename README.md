# Link Aggregation Tool | 網頁連結集結工具

這是一個簡單而強大的工具，用於收集和展示網頁連結。
> **注意**：本專案已移除自動抓取功能，改為手動輸入標題與描述，以確保部署相容性與資料正確性。

## 🚀 功能特色
- 📝 **手動輸入元數據**：自行設定標題、描述、圖片與備註。
- 🔗 **連結備註與提醒**：可為連結添加備註，並在卡片上醒目顯示。
- 🤖 **智慧公告整合**：備註中若包含日期，將自動同步至公告欄。
- 🎨 **現代化介面**：使用 Glassmorphism 設計風格，支援響應式佈局。
- 💾 **資料持久化**：連結資料儲存在後端 JSON 檔案中。

## 📖 使用說明
詳細操作教學請參閱 [使用說明書 (User Manual)](user_manual.md)。

## 🛠 部署 (Deployment)

本專案使用 **Flask** 後端，建議部署至 **Render**。

### Render 部署步驟
1. 註冊 [Render](https://render.com/) 帳號。
2. 連結 GitHub Repository。
3. 建立 **New Web Service**。
4. Render 會自動讀取 `render.yaml` 進行設定。
5. 部署完成後即可使用。

### CI/CD 自動化
本專案包含 GitHub Actions (`.github/workflows/ci_cd.yml`)：
- 每次 Push 到 `main` 分支時，會自動檢查 Python 環境與依賴安裝。
- 若設定了 `RENDER_DEPLOY_HOOK_URL` Secret，可自動觸發 Render 重新部署。

## 📂 專案結構
```
.
├── app.py              # Flask 後端主程式
├── render.yaml         # Render 部署設定
├── requirements.txt    # Python 套件依賴
├── static/             # 前端資源 (CSS, JS)
├── templates/          # HTML 模板
├── user_manual.md      # 使用者說明書
└── links.json          # 資料儲存檔 (自動生成)
```

## 📝 操作紀錄 (Changelog)
- **2026-01-05**: 
    - 移除自動爬蟲功能 (BeautifulSoup/Requests)。
    - 新增前端手動輸入介面 (標題、描述、圖片)。
    - 新增 `user_manual.md`。
    - 設定 Render 部署流程與 CI/CD 檢查。
    - 更新 `.gitignore` 排除敏感檔案。

---
*Created by Antigravity*
