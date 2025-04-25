-- Inicialización de la base de datos Unika
-- Este script creará la base de datos y el usuario con los permisos necesarios

-- Crear la base de datos si no existe
CREATE DATABASE IF NOT EXISTS unika_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Cambiar a la base de datos creada
USE unika_db;

-- Configurar zona horaria y manejo de caracteres
SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET foreign_key_checks = 0;

-- Crear usuario si no existe y asignar permisos
-- Usar método de autenticación caching_sha2_password (recomendado) en lugar de mysql_native_password
CREATE USER IF NOT EXISTS 'unika_user'@'%' IDENTIFIED BY 'unika_password';
GRANT ALL PRIVILEGES ON unika_db.* TO 'unika_user'@'%';

-- También permitir localhost por si acaso
CREATE USER IF NOT EXISTS 'unika_user'@'localhost' IDENTIFIED BY 'unika_password';
GRANT ALL PRIVILEGES ON unika_db.* TO 'unika_user'@'localhost';

-- Aplicar privilegios
FLUSH PRIVILEGES;

-- Mensaje de confirmación
SELECT 'Base de datos inicializada correctamente' AS 'Mensaje';