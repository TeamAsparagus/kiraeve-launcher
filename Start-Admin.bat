@echo off
title Asparagus Admin Console
chcp 65001 >nul
cls
echo ========================================================
echo   ASPARAGUS LAUNCHER - ADMIN CONTROL CONSOLE
echo ========================================================
echo.
echo กำลังเริ่มต้นระบบ Admin Console...
echo เข้าสู่ระบบด้วย:
echo   Username: admin
echo   Password: changeme123
echo.
echo ========================================================
cd /d "%~dp0"
python tools\admin_server.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo เกิดข้อผิดพลาด ไม่พบ Python หรือเกิดปัญหาในการรัน
    pause
)
