@echo off
setlocal
cd /d "%~dp0"

echo Preparando la beta de AnalizadorCualiUY...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0build-beta.ps1'"
if errorlevel 1 (
  echo No se pudo preparar la beta.
  pause
  exit /b 1
)

start "AnalizadorCualiUY Beta" http://localhost:4173
echo La beta esta disponible en http://localhost:4173
echo Para cerrarla, cierre esta ventana.
python -m http.server 4173 --directory "%~dp0dist-beta"
