@echo off
title OpenSourceCommunity - Local Development Server
echo ===================================================
echo [LOG: 20260528_1158] Starting Local Development Server...
echo Make sure you have installed dependencies (pnpm install)
echo and Docker is running if you need Supabase.
echo ===================================================
echo.

:: Run the local dev server using pnpm
call pnpm dev

echo.
echo ===================================================
echo Development server stopped or failed to start.
echo ===================================================
pause
