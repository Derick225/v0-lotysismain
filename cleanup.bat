@echo off
echo Nettoyage final du projet...

REM Attendre un peu puis supprimer le dossier vide
timeout /t 2 /nobreak >nul
rmdir /s /q v0-lotysismain-0-lotysismain 2>nul

echo Nettoyage termine !
del cleanup.bat
