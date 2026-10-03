@echo off
cd /d "%~dp0"
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example
)
echo Starting SkillPilot AI...
node server.js
pause
