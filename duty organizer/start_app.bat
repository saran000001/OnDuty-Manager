@echo off
cd /d "%~dp0"
title Duty Organizer

echo Starting Duty Organizer...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

REM Check for node_modules
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Failed to install dependencies.
        pause
        exit /b
    )
)

echo.
echo Building CSS...
call npm run build:css

echo.
echo Opening Browser...
start "" "http://localhost:3000"

echo.
echo Starting Server...
npm start
pause
