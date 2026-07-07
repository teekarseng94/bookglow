@echo off
setlocal
cd /d "%~dp0"

set "FIREBASE=%~dp0node_modules\.bin\firebase.cmd"
if not exist "%FIREBASE%" (
  echo === Installing firebase-tools ===
  call npm install
  if errorlevel 1 goto :error
  if not exist "%FIREBASE%" (
    echo firebase-tools not found after npm install.
    goto :error
  )
)

echo === 1. CLEANING PREVIOUS BUILDS ===
if exist "dist-dashboard" rmdir /s /q "dist-dashboard"
if exist "dist-booking" rmdir /s /q "dist-booking"
if exist "apps\customer-site\dist" rmdir /s /q "apps\customer-site\dist"

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

echo === 4. APPLYING TARGETS ===
call "%FIREBASE%" target:apply hosting booking-site bookglow-83fb3
if errorlevel 1 goto :error
call "%FIREBASE%" target:apply hosting dashboard-site bookglow-83fb3-dashboard
if errorlevel 1 goto :error

echo === 5. DEPLOYING TO FIREBASE ===
call "%FIREBASE%" deploy --only hosting
if errorlevel 1 goto :error

echo.
echo === DEPLOYMENT SUCCESSFUL ===
pause
exit /b 0

:error
echo.
echo *** DEPLOYMENT FAILED (exit code %ERRORLEVEL%) ***
pause
exit /b 1
