const productAggregatorService = require('../services/productAggregatorService');

class ProductController {
    async searchByBarcode(req, res) {
        try {
            const { barcode } = req.params;
            const userId = req.query.userId || null; // Obtener userId del query

            const result = await productAggregatorService.searchByBarcode(barcode, userId);

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            res.status(404).json({
                success: false,
                error: error.message,
            });
        }
    }

    async searchByName(req, res) {
        try {
            const { query } = req.query;

            if (!query) {
                return res.status(400).json({
                    success: false,
                    error: 'Query parameter is required',
                });
            }

            const results = await productAggregatorService.searchByName(query);

            res.json({
                success: true,
                data: results,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    }

    async getPriceHistory(req, res) {
        res.json({
            success: true,
            message: 'Price history - Coming soon',
            data: [],
        });
    }
}

module.exports = new ProductController();
