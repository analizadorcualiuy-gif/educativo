@echo off
setlocal
cd /d "%~dp0"

echo Preparando la edicion educativa de AnalizadorCualiUY...
powershell -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0build-educational.ps1'"
if errorlevel 1 (
  echo No se pudo preparar la edicion educativa.
  pause
  exit /b 1
)

start "AnalizadorCualiUY Educativa" http://localhost:4174
echo La edicion educativa esta disponible en http://localhost:4174
echo Para cerrarla, cierre esta ventana.
python -m http.server 4174 --directory "%~dp0dist-educativa"
