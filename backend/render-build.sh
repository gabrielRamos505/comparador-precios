#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
npm install

# Instalar navegador Chrome para Puppeteer
# Forzar permisos de ejecución en el binario de puppeteer para evitar "Permission denied"
chmod +x ./node_modules/.bin/puppeteer
./node_modules/.bin/puppeteer browsers install chrome