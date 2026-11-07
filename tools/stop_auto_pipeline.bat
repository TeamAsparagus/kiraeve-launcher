@echo off
echo Stopping Unity VCS Watcher...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*uvcs_auto_pipeline.py*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force; Write-Host 'Stopped watcher process PID' $_.ProcessId }"
echo Stopped.
pause
