class PriceHistory {
    constructor(productId, platform, price, timestamp) {
        this.id = Date.now().toString();
        this.productId = productId;
        this.platform = platform;
        this.price = price;
        this.timestamp = timestamp || new Date();
    }
}

let priceHistory = [];

module.exports = {
    PriceHistory,
    priceHistory
};
