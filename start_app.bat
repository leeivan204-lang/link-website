@echo off
echo [INFO] Starting Link Aggregation App...
call venv\Scripts\activate
start http://localhost:8000
python app.py
pause
