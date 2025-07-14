@echo off
title UNIKA - Migración a Prisma
color 0A

echo.
echo ========================================
echo    MIGRACION UNIKA A PRISMA
echo ========================================
echo.

cd /d E:\Proyectos\Unika

echo 1. Instalando dependencias...
call npm install

echo.
echo 2. Generando cliente Prisma...
call npx prisma generate

echo.
echo 3. Aplicando migraciones...
call npx prisma db push

echo.
echo 4. Iniciando aplicación con Prisma...
call npm start

pause
