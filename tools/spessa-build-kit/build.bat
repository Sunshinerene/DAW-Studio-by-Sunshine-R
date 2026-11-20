@echo off
REM Windows: alles in einem Rutsch.   Aufruf:  build.bat ..\index_ueberarbeitet.html
cd /d "%~dp0"
set HTML=%1
if "%HTML%"=="" set HTML=..\index_ueberarbeitet.html
call npm install --no-audit --no-fund || goto :err
call npx --yes bun build.mjs || goto :err
node inject.mjs "%HTML%" || goto :err
echo.
echo Fertig.
goto :eof
:err
echo.
echo FEHLER - bitte die Meldung oben lesen (siehe README.md).
exit /b 1
