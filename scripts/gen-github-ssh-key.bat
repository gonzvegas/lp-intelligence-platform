@echo off
setlocal
set KEY=%USERPROFILE%\.ssh\id_ed25519_github
if exist "%KEY%.pub" (
  echo Key already exists: %KEY%
  type "%KEY%.pub"
  exit /b 0
)
if not exist "%USERPROFILE%\.ssh" mkdir "%USERPROFILE%\.ssh"
ssh-keygen -t ed25519 -C "gonzvegas@github" -f "%KEY%" -N ""
echo.
echo === Copy everything below into GitHub -^> Settings -^> SSH keys -^> New SSH key ===
echo.
type "%KEY%.pub"
