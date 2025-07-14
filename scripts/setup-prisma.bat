@echo off
title UNIKA - Setup Prisma + PostgreSQL + Vercel
color 0A

echo.
echo 🚀 Configurando UNIKA para PostgreSQL + Prisma + Vercel
echo ==========================================================
echo.

cd /d E:\Proyectos\Unika

echo 📦 Instalando dependencias de Prisma...
call npm install @prisma/client prisma

echo.
echo 🗑️ Removiendo dependencias antiguas...
call npm uninstall sequelize mysql2

echo.
echo 🔧 Generando cliente de Prisma...
call npx prisma generate

echo.
echo 🗄️ Ejecutando migraciones...
call npx prisma migrate dev --name init

echo.
echo ✅ Verificando conexión a base de datos...
call npx prisma db push

echo.
echo ✅ Configuración completada
echo.
echo 📋 Próximos pasos:
echo 1. Verificar que tu .env tenga la DATABASE_URL correcta
echo 2. Ejecutar: npm run build
echo 3. Probar localmente: npm run dev
echo 4. Desplegar: vercel --prod
echo.

pause
