#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
npm install

# Instalar navegador Chrome para Puppeteer
# Usamos la ruta directa al binario instalado localmente para evitar problemas de permisos con npx
./node_modules/.bin/puppeteer browsers install chrome