const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { getRandomUserAgent } = require('../../utils/userAgents');
const cacheService = require('../cacheService');

// Activar modo stealth (oculta que es Puppeteer)
puppeteer.use(StealthPlugin());

class GoogleSearchScraper {
    constructor() {
        this.baseUrl = 'https://www.google.com';
        this.lastRequestTime = 0;
        this.requestCount = 0;
    }

    /**
     * Rate limiting inteligente para evitar detección
     */
    async waitRandomDelay() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        // Delay aleatorio entre 3-6 segundos
        const minDelay = 3000 + Math.random() * 3000;

        if (timeSinceLastRequest < minDelay) {
            const waitTime = minDelay - timeSinceLastRequest;
            console.log(`   ⏳ Esperando ${Math.round(waitTime / 1000)}s (anti-detección)...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
        this.requestCount++;

        // Pausa larga cada 5 búsquedas
        if (this.requestCount % 5 === 0) {
            console.log(`   😴 Pausa extendida (cada 5 búsquedas)...`);
            await new Promise(resolve => setTimeout(resolve, 8000));
        }
    }

    /**
     * Buscar tiendas peruanas que venden un producto
     * @param {string} productName - Nombre del producto
     * @returns {Promise<Array>} Lista de URLs de tiendas
     */
    async findStoresByProduct(productName) {
        // Verificar caché primero
        const cacheKey = `google_search_${productName.toLowerCase().replace(/\s+/g, '_')}`;
        const cached = cacheService.get(cacheKey);

        if (cached) {
            console.log(`📦 Usando resultados en cache para "${productName}"`);
            return cached;
        }

        await this.waitRandomDelay();

        let browser;

        try {
            // Configuración anti-detección profesional
            browser = await puppeteer.launch({
                headless: 'new',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-blink-features=AutomationControlled',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080',
                ],
                ignoreHTTPSErrors: true,
            });

            const page = await browser.newPage();

            // Viewport realista con variación aleatoria
            await page.setViewport({
                width: 1920 + Math.floor(Math.random() * 100),
                height: 1080 + Math.floor(Math.random() * 100),
                deviceScaleFactor: 1,
                hasTouch: false,
                isLandscape: true,
                isMobile: false,
            });

            // User-Agent aleatorio
            await page.setUserAgent(getRandomUserAgent());

            // Headers realistas
            await page.setExtraHTTPHeaders({
                'Accept-Language': 'es-PE,es-419;q=0.9,es;q=0.8,en;q=0.7',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
            });

            // Ocultar automatización avanzado
            await page.evaluateOnNewDocument(() => {
                // Sobrescribir navigator.webdriver
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => false,
                });

                // Sobrescribir plugins
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [1, 2, 3, 4, 5],
                });

                // Sobrescribir languages
                Object.defineProperty(navigator, 'languages', {
                    get: () => ['es-PE', 'es-419', 'es', 'en-US', 'en'],
                });

                // Chrome runtime
                window.chrome = {
                    runtime: {},
                };

                // Permissions
                const originalQuery = window.navigator.permissions.query;
                window.navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: Notification.permission }) :
                        originalQuery(parameters)
                );

                // Plugin array
                Object.defineProperty(navigator, 'plugins', {
                    get: () => [
                        {
                            0: { type: "application/x-google-chrome-pdf" },
                            description: "Portable Document Format",
                            filename: "internal-pdf-viewer",
                            length: 1,
                            name: "Chrome PDF Plugin"
                        }
                    ],
                });
            });

            // Construir query optimizada
            const query = `${productName} precio comprar site:.pe`;
            const searchUrl = `${this.baseUrl}/search?q=${encodeURIComponent(query)}&num=20&gl=pe&hl=es`;

            console.log(`🔍 Buscando en Google: "${query}"`);

            // Navegar como humano
            await page.goto(searchUrl, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Simular comportamiento humano
            await page.mouse.move(100 + Math.random() * 200, 100 + Math.random() * 200);
            await new Promise(resolve => setTimeout(resolve, 500));

            // Scroll aleatorio
            await page.evaluate(() => {
                window.scrollBy(0, 200 + Math.random() * 300);
            });

            // Esperar aleatoriamente (1.5-3 segundos)
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

            // Verificar CAPTCHA
            const pageContent = await page.content();
            const hasCaptcha = await page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                return bodyText.includes('unusual traffic') ||
                    bodyText.includes('captcha') ||
                    bodyText.includes('verificar que no eres un robot') ||
                    document.querySelector('iframe[src*="recaptcha"]') !== null ||
                    document.querySelector('form[action*="sorry"]') !== null;
            });

            if (hasCaptcha) {
                console.error('⚠️ CAPTCHA detectado - Google requiere verificación');
                console.log('💡 Tip: Espera 10-15 minutos antes de volver a intentar');
                await page.screenshot({ path: 'captcha-detected.png' });
                return [];
            }

            // Extraer resultados con múltiples estrategias
            const storeUrls = await page.evaluate(() => {
                const results = [];
                const seenDomains = new Set();

                // Múltiples selectores (Google cambia frecuentemente)
                const selectors = [
                    'div#search div.g a[href^="http"]',
                    'div.yuRUbf a',
                    'div[data-sokoban-container] a[href^="http"]',
                    'a[jsname="UWckNb"]',
                    'div.tF2Cxc a',
                    'div#rso a[href^="http"]',
                ];

                let allLinks = [];
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        allLinks = Array.from(elements);
                        break;
                    }
                }

                if (allLinks.length === 0) {
                    return [];
                }

                allLinks.forEach(link => {
                    try {
                        const url = link.href;

                        // Filtrar URLs no deseadas
                        const excludeKeywords = [
                            'google.com',
                            'youtube.com',
                            'facebook.com',
                            'instagram.com',
                            'twitter.com',
                            'linkedin.com',
                            'tiktok.com',
                            'wikipedia.org',
                            'maps.google',
                            'translate.google',
                        ];

                        if (excludeKeywords.some(keyword => url.toLowerCase().includes(keyword))) {
                            return;
                        }

                        const domain = new URL(url).hostname.replace('www.', '');

                        // Solo dominios .pe y evitar duplicados
                        if (domain.endsWith('.pe') && !seenDomains.has(domain)) {
                            results.push({
                                url: url,
                                title: link.innerText.trim() || link.textContent.trim() || '',
                                domain: domain
                            });
                            seenDomains.add(domain);
                        }
                    } catch (e) {
                        // Ignorar URLs inválidas
                    }
                });

                return results.slice(0, 8);
            });

            if (storeUrls.length === 0) {
                console.warn('⚠️ No se encontraron tiendas peruanas en Google');
                await page.screenshot({ path: 'debug-google-no-results.png' });
                console.log('📸 Screenshot guardado en debug-google-no-results.png');
            } else {
                console.log(`✅ Google encontró ${storeUrls.length} tiendas: ${storeUrls.map(s => s.domain).join(', ')}`);

                // Guardar en caché
                cacheService.set(cacheKey, storeUrls);
            }

            return storeUrls;

        } catch (error) {
            console.error('❌ Google Search Error:', error.message);
            return [];
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}

module.exports = new GoogleSearchScraper();
