@echo off
chcp 65001 >nul
title Warzone Card Game - Local Service Console
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\local-service-control.ps1"
if errorlevel 1 (
  echo.
  echo Service console exited with an error. Check the message above.
  pause
)
