@echo off
echo =======================================================
echo            Configuracion de Docker para Unika
echo =======================================================
echo.

REM Verificar si Docker está instalado
echo [1/7] Verificando si Docker esta instalado...
docker --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no esta instalado. Por favor, instala Docker antes de continuar.
    goto :end
)
echo [OK] Docker esta instalado correctamente.
echo.

REM Verificar si Docker Compose está instalado
echo [2/7] Verificando si Docker Compose esta instalado...
docker-compose --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Compose no esta instalado. Por favor, instala Docker Compose antes de continuar.
    goto :end
)
echo [OK] Docker Compose esta instalado correctamente.
echo.

REM Detener y eliminar contenedores existentes si los hay
echo [3/7] Deteniendo contenedores existentes si los hay...
docker-compose down
echo [OK] Contenedores detenidos.
echo.

REM Crear imagen Docker
echo [4/7] Construyendo la imagen Docker...
docker-compose build --no-cache
if %errorlevel% neq 0 (
    echo ERROR: No se pudo construir la imagen Docker.
    goto :end
)
echo [OK] Imagen creada exitosamente.
echo.

REM Iniciar contenedores
echo [5/7] Iniciando contenedores...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERROR: No se pudieron iniciar los contenedores.
    goto :end
)
echo [OK] Contenedores iniciados correctamente.
echo.

REM Mostrar contenedores en ejecución
echo [6/7] Verificando contenedores en ejecucion...
docker-compose ps
echo.

REM Mostrar logs
echo [7/7] Mostrando logs de los contenedores...
echo Presiona Ctrl+C para salir de los logs sin detener los contenedores.
echo.
docker-compose logs -f

echo.
echo =======================================================
echo     CONFIGURACION COMPLETADA
echo =======================================================
echo.
echo La aplicacion Unika esta disponible en: http://localhost:3000
echo Base de datos MySQL disponible en: localhost:3307
echo   - Usuario: unika_user
echo   - Contraseña: unika_password
echo   - Base de datos: unika_db
echo.
echo Para ejecutar las migraciones manualmente, usa:
echo   docker exec -it unika-app npm run migrate
echo.
echo Para detener los contenedores:
echo   docker-compose down
echo.
echo Para ver los logs:
echo   docker-compose logs -f
echo =======================================================
echo.

:end
pause