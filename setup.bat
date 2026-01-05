@echo off
echo [INFO] Setting up Python environment...
py -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
echo [INFO] Setup complete. To start the app, run: start_app.bat
pause
