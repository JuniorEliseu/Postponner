@echo off
echo ==========================================
echo       Iniciando o LocalFlow (Dev)
echo ==========================================
echo.
echo Compilando e verificando tipos (TSC)...
call npm.cmd run build

echo.
echo Iniciando o servidor de desenvolvimento (Vite)...
echo Pressione CTRL+C para encerrar o servidor.
echo.
call npm.cmd run dev -- --open
