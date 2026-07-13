@echo off
setlocal
title System3 Worker
cd /d "%~dp0apps\worker"

where py >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Python fehlt. Bitte installieren:
  echo  1. https://www.python.org/downloads/ oeffnen, "Download Python" klicken
  echo  2. Im Installer den Haken "Add python.exe to PATH" setzen!
  echo  3. Danach dieses Skript erneut doppelklicken.
  echo.
  pause
  exit /b 1
)

if not exist .env (
  echo.
  echo  Die Datei .env fehlt. Notepad oeffnet sich jetzt.
  echo  Fuege die 3 Zeilen ein, die Claude dir geschickt hat,
  echo  dann speichern (Strg+S) und Notepad schliessen.
  echo.
  notepad .env
)

echo Installiere Abhaengigkeiten (nur beim ersten Mal dauert das etwas)...
py -3 -m pip install -q -e . || (echo Installation fehlgeschlagen & pause & exit /b 1)

echo.
echo  Worker laeuft. Fortschritt siehst du hier unten und in Supabase
echo  (Table Editor: businesses / contacts / jobs).
echo  Zum Beenden dieses Fenster einfach schliessen.
echo.
py -3 -m worker.main
pause
