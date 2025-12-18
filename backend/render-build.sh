#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
npm install

# Instalar navegador Chrome para Puppeteer (usará .puppeteerrc.cjs)
# Forzamos permisos de ejecución en el binario por seguridad
chmod +x ./node_modules/.bin/puppeteer
./node_modules/.bin/puppeteer browsers install chrome