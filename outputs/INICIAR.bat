@echo off
chcp 65001 > nul
title Space Liberdade
color 1F

echo.
echo  ===============================================
echo    SPACE LIBERDADE - iniciando o site
echo  ===============================================
echo.

REM Verifica se o Node.js esta instalado
where node >nul 2>nul
if errorlevel 1 (
    echo  [X] Node.js nao foi encontrado no seu computador.
    echo.
    echo  Baixe e instale o Node.js LTS antes de continuar:
    echo  https://nodejs.org/pt
    echo.
    echo  Depois de instalar, da duplo-clique neste arquivo de novo.
    echo.
    pause
    exit /b 1
)

echo  [OK] Node.js detectado:
node --version
echo.
echo  Iniciando o servidor na porta 3000...
echo  O navegador vai abrir automaticamente em alguns segundos.
echo.
echo  Para parar o servidor: feche esta janela ou aperte Ctrl+C.
echo.

REM Abre o navegador depois de 3 segundos (em paralelo)
start "" cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3000"

REM Inicia o servidor (bloqueia ate fechar)
node server.js

pause
