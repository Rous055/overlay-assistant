@echo off
cd /d "%~dp0"
echo Устанавливаю зависимости...
call npm install
echo.
echo Готово. Можно закрыть окно и запустить start.bat
pause
