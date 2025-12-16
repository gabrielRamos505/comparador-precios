const axios = require('axios');
const cheerio = require('cheerio');

class AmazonScraperService {
    constructor() {
        this.baseUrl = 'https://www.amazon.com';
        this.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        };
    }

    async searchProduct(query) {
        try {
            const searchUrl = `${this.baseUrl}/s?k=${encodeURIComponent(query)}`;

            const response = await axios.get(searchUrl, {
                headers: this.headers,
                timeout: 10000,
            });

            const $ = cheerio.load(response.data);
            const results = [];

            // Selector para productos en resultados de búsqueda
            $('div[data-component-type="s-search-result"]').each((index, element) => {
                if (index >= 5) return false; // Solo los primeros 5

                const $element = $(element);

                const asin = $element.attr('data-asin');
                const title = $element.find('h2 a span').text().trim();
                const priceWhole = $element.find('.a-price-whole').first().text().trim();
                const priceFraction = $element.find('.a-price-fraction').first().text().trim();
                const imageUrl = $element.find('img.s-image').attr('src');
                const link = $element.find('h2 a').attr('href');

                if (title && priceWhole) {
                    const price = parseFloat(priceWhole.replace(/,/g, '') + '.' + priceFraction);

                    results.push({
                        id: asin || `amazon-${Date.now()}-${index}`,
                        platform: 'Amazon',
                        name: title,
                        price: isNaN(price) ? 0 : price,
                        currency: 'USD',
                        shipping: 0, // Amazon suele tener envío gratis con Prime
                        url: link ? `${this.baseUrl}${link}` : searchUrl,
                        imageUrl: imageUrl || null,
                        available: true,
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Error scraping Amazon:', error.message);

            // Datos de fallback simulados
            return this._getMockAmazonData(query);
        }
    }

    _getMockAmazonData(query) {
        // Datos simulados cuando el scraping falla
        const basePrice = 15 + Math.random() * 20;

        return [
            {
                id: `amazon-mock-${Date.now()}`,
                platform: 'Amazon',
                name: `${query} - Amazon Product`,
                price: basePrice,
                currency: 'USD',
                shipping: 0,
                url: `${this.baseUrl}/s?k=${encodeURIComponent(query)}`,
                imageUrl: null,
                available: true,
            },
        ];
    }
}

module.exports = new AmazonScraperService();
