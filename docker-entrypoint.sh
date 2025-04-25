#!/bin/bash

echo "🔄 Verificando variables de entorno esenciales..."
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo "❌ ERROR: Variables de entorno necesarias no configuradas"
  echo "DB_HOST=${DB_HOST:-no configurado}"
  echo "DB_USER=${DB_USER:-no configurado}"
  echo "DB_NAME=${DB_NAME:-no configurado}"
  echo "DB_PASSWORD=[OCULTO]"
  exit 1
fi
echo "✅ Variables de entorno verificadas correctamente"

# Usar docker-wait para esperar a que MySQL esté disponible
echo "🔄 Esperando a que los servicios dependientes estén disponibles..."
/wait
echo "✅ Servicios dependientes disponibles"

# Función para verificar conexión a MySQL usando herramientas específicas
check_mysql_connection() {
  # Intentar la conexión con diferentes métodos
  mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1
}

# Verificar si podemos conectarnos a la base de datos
echo "🔄 Verificando conectividad con MySQL..."
MAX_TRIES=30
CURRENT_TRY=0

while ! check_mysql_connection; do
  CURRENT_TRY=$((CURRENT_TRY+1))
  if [ $CURRENT_TRY -ge $MAX_TRIES ]; then
    echo "⚠️ No se pudo verificar la conexión MySQL después de $MAX_TRIES intentos"
    echo "⚠️ Continuando de todos modos ya que docker-wait verificó que el servicio está activo"
    break
  fi
  
  echo "⏳ Intentando conexión a MySQL... intento $CURRENT_TRY de $MAX_TRIES"
  sleep 2
done

if [ $CURRENT_TRY -lt $MAX_TRIES ]; then
  echo "✅ Conexión a MySQL verificada correctamente"
fi

# Verificar si la base de datos existe
echo "🔍 Verificando si la base de datos '$DB_NAME' existe..."
if mysql -h "$DB_HOST" -P "${DB_PORT:-3306}" -u "$DB_USER" -p"$DB_PASSWORD" -e "USE $DB_NAME" >/dev/null 2>&1; then
  echo "✅ Base de datos '$DB_NAME' verificada"
else
  echo "⚠️ No se pudo verificar la base de datos. Continuando de todos modos."
fi

# Aplicar migraciones con manejo de errores
echo "🔄 Ejecutando migraciones de la base de datos..."
NODE_ENV=production npm run migrate || {
  echo "⚠️ Error al ejecutar migraciones automáticamente"
  echo "⚠️ Continuando con el inicio de la aplicación de todos modos"
}

# Iniciar la aplicación
echo "🚀 Iniciando la aplicación Unika..."
npm start