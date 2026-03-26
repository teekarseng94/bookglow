@echo off
setlocal
cd /d "%~dp0"

echo === 1. CLEANING PREVIOUS BUILDS ===
if exist "dist-dashboard" rmdir /s /q "dist-dashboard"
if exist "zenspa dashboard\dist" rmdir /s /q "zenspa dashboard\dist"

echo === 2. BUILDING BACKEND (DASHBOARD) ===
cd "zenspa backend"
call npm run build -- --outDir ../dist-dashboard
if errorlevel 1 goto :error

echo === 3. BUILDING FRONTEND (BOOKING) ===
cd "..\zenspa dashboard"
call npm run build
if errorlevel 1 goto :error

cd ..

echo === 4. APPLYING TARGETS ===
call firebase target:apply hosting booking-site zenspabookingsystem
call firebase target:apply hosting dashboard-site razak-residence-2026

echo === 5. DEPLOYING TO FIREBASE ===
call firebase deploy --only hosting
if errorlevel 1 goto :error

echo.
echo === DEPLOYMENT SUCCESSFUL ===
pause
exit /b 0

:error
echo.
echo *** FAILED AT STEP %ERRORLEVEL% ***
pause
exit /b 1
