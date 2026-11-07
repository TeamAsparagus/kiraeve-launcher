@echo off
echo Starting Kiraeve Unity VCS Auto-Pipeline Watcher in background...
wscript.exe "%~dp0run_watcher_background.vbs"
echo Watcher is now running silently in the background!
echo It will check Unity VCS every 30s and auto-build and auto-publish to Cloudflare R2 when you commit.
pause
