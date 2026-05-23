"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemPriceHistory = void 0;
const typeorm_1 = require("typeorm");
const item_entity_1 = require("./item.entity");
let ItemPriceHistory = class ItemPriceHistory {
    id;
    item;
    price;
    changedAt;
};
exports.ItemPriceHistory = ItemPriceHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], ItemPriceHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => item_entity_1.Item, (item) => item.priceHistory, { onDelete: 'CASCADE' }),
    __metadata("design:type", item_entity_1.Item)
], ItemPriceHistory.prototype, "item", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, transformer: {
            to: (value) => value,
            from: (value) => parseFloat(value),
        } }),
    __metadata("design:type", Number)
], ItemPriceHistory.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], ItemPriceHistory.prototype, "changedAt", void 0);
exports.ItemPriceHistory = ItemPriceHistory = __decorate([
    (0, typeorm_1.Entity)('item_price_history')
], ItemPriceHistory);
//# sourceMappingURL=item-price-history.entity.js.map