#!/usr/bin/env bash
# exit on error
set -o errexit

# Instalar dependencias
npm install

# Instalar navegador Chrome para Puppeteer
# Esto lo descarga en /opt/render/.cache/puppeteer por defecto en Render
npx puppeteer browsers install chrome