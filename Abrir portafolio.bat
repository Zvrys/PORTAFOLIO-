@echo off
title Portafolio
cd /d "%~dp0"
start "" http://localhost:4173
node servidor.js
pause
