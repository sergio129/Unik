#!/bin/bash

echo "🚀 Configurando UNIKA para PostgreSQL + Prisma + Vercel"
echo "=========================================================="

# 1. Instalar dependencias de Prisma
echo "📦 Instalando dependencias de Prisma..."
npm install @prisma/client prisma

# 2. Remover dependencias de MySQL/Sequelize
echo "🗑️ Removiendo dependencias antiguas..."
npm uninstall sequelize mysql2

# 3. Generar cliente de Prisma
echo "🔧 Generando cliente de Prisma..."
npx prisma generate

# 4. Ejecutar migraciones
echo "🗄️ Ejecutando migraciones..."
npx prisma migrate dev --name init

# 5. Verificar conexión
echo "✅ Verificando conexión a base de datos..."
npx prisma db push

echo "✅ Configuración completada"
echo ""
echo "📋 Próximos pasos:"
echo "1. Verificar que tu .env tenga la DATABASE_URL correcta"
echo "2. Ejecutar: npm run build"
echo "3. Probar localmente: npm run dev"
echo "4. Desplegar: vercel --prod"
