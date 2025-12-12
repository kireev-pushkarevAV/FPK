@echo off
echo Starting Finance Assistant Application...
echo.
echo Server will be available at: http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -File .\server-simple.ps1 -Port 3001

pause