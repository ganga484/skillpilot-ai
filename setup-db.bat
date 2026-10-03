@echo off
cd /d "%~dp0"
echo Setting up the SkillPilot database...
if not exist "node_modules\pg" (
  echo Installing the database helper ^(one time, needs internet^)...
  call npm install pg --no-save --no-audit --no-fund --loglevel=error
)
node setup-db.js
pause
