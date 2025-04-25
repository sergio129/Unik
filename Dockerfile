FROM node:18-alpine

WORKDIR /app

# Instalar herramientas adicionales necesarias
RUN apk add --no-cache mysql-client curl wget bash

# Añadir docker-wait para sincronización entre servicios
ENV WAIT_VERSION 2.9.0
ADD https://github.com/ufoscout/docker-compose-wait/releases/download/$WAIT_VERSION/wait /wait
RUN chmod +x /wait

# Copiar los archivos de definición de paquetes
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código fuente
COPY . .

# Exponer el puerto de la aplicación
EXPOSE 3000

# Script de entrada para iniciar la aplicación
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Comando para iniciar la aplicación
ENTRYPOINT ["/docker-entrypoint.sh"]