@echo off
setlocal
cd /d "%~dp0"

echo.
echo Production frontend hosting is Vercel, not Firebase Hosting.
echo   Customer:  https://bookglow.vercel.app
echo   Merchant:  Vercel project bookglow-merchant
echo.
echo Firebase Hosting remains legacy only.
echo Firebase Functions remain available:
echo   npm run deploy:functions
echo   firebase deploy --only functions
echo.

set "FIREBASE=%~dp0node_modules\.bin\firebase.cmd"

echo === 1. CLEANING PREVIOUS BUILDS ===
if exist "dist-dashboard" rmdir /s /q "dist-dashboard"
if exist "dist-booking" rmdir /s /q "dist-booking"
if exist "dist-vercel" rmdir /s /q "dist-vercel"
if exist "apps\customer-site\dist" rmdir /s /q "apps\customer-site\dist"
if exist "apps\merchant-portal\dist" rmdir /s /q "apps\merchant-portal\dist"

echo === 2. BUILDING MERCHANT PORTAL (DASHBOARD) ===
cd "apps\merchant-portal"
call npm run build -- --outDir ../../dist-dashboard
if errorlevel 1 goto :error

echo === 3. BUILDING CUSTOMER SITE (BOOKING) ===
cd ..\..
cd "apps\customer-site"
call npm run build -- --outDir ../../dist-booking
if errorlevel 1 goto :error

cd ..\..

echo.
echo === FRONTEND BUILD COMPLETE ===
echo Deploy customer and merchant frontends with Vercel, not Firebase Hosting.
echo Legacy Firebase Hosting only: npm run deploy:hosting:legacy
echo Firebase Functions: npm run deploy:functions
echo.
pause
exit /b 0

:error
echo.
echo *** BUILD FAILED (exit code %ERRORLEVEL%) ***
pause
exit /b 1
