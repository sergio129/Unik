# Despliegue de Unika en Docker

Este documento contiene las instrucciones para desplegar la aplicación Unika en contenedores Docker.

## Requisitos previos

- [Docker](https://www.docker.com/get-started) instalado y en ejecución
- [Docker Compose](https://docs.docker.com/compose/install/) instalado

## Inicio rápido

1. Ejecuta el script `setup.bat` incluido. Este script automatiza todo el proceso de despliegue.
2. Accede a la aplicación en [http://localhost:3000](http://localhost:3000)

## Estructura de Docker

El entorno Docker consiste en:

- **unika-app**: Contenedor de la aplicación Node.js en el puerto 3000
- **unika-db**: Contenedor de MySQL en el puerto 3307

## Comandos útiles

### Iniciar los contenedores
```bash
docker-compose up -d
```

### Ver los logs
```bash
docker-compose logs -f
```

### Detener los contenedores
```bash
docker-compose down
```

### Ejecutar migraciones manualmente
```bash
docker exec -it unika-app npm run migrate
```

## Solución de problemas comunes

### Error: "Error en el servidor" en la pantalla de login

Este error puede ocurrir por varias razones:

1. **La base de datos no está lista**:
   - Espera unos minutos más para que MySQL termine de inicializarse
   - Verifica los logs con `docker-compose logs -f db`

2. **Problemas de conexión**:
   - Asegúrate de que los puertos 3000 y 3307 no estén siendo utilizados por otras aplicaciones
   - Verifica que Docker tenga suficientes recursos asignados

3. **Migraciones no ejecutadas**:
   - Ejecuta las migraciones manualmente: `docker exec -it unika-app npm run migrate`

4. **Reinicio de contenedores**:
   - A veces un simple reinicio resuelve el problema:
   ```bash
   docker-compose restart
   ```

### Error: "No se puede conectar a la base de datos"

1. Verifica las credenciales en el archivo `docker-compose.yml`
2. Asegúrate de que el contenedor de la base de datos esté funcionando:
   ```bash
   docker ps | grep unika-db
   ```
3. Intenta conectarte manualmente a la base de datos:
   ```bash
   docker exec -it unika-db mysql -uunika_user -punika_password unika_db
   ```

## Variables de entorno

Las variables de entorno están configuradas en el archivo `docker-compose.yml`. Si necesitas modificarlas, edita este archivo y reconstruye los contenedores:

```bash
docker-compose down
docker-compose up -d --build
```

## Volúmenes

- **mysql_data**: Almacena los datos de la base de datos
- **./public/uploads**: Almacena los archivos subidos a la aplicación
- **./logs**: Almacena los logs de la aplicación

## Seguridad

Para entornos de producción, se recomienda:

1. Cambiar todas las contraseñas en `docker-compose.yml`
2. Configurar un proxy inverso con HTTPS (como Nginx)
3. Limitar el acceso a los puertos de la base de datos