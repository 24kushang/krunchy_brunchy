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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const item_entity_1 = require("../../database/entities/item.entity");
const item_price_history_entity_1 = require("../../database/entities/item-price-history.entity");
let ItemsService = class ItemsService {
    itemRepository;
    priceHistoryRepository;
    constructor(itemRepository, priceHistoryRepository) {
        this.itemRepository = itemRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }
    async findAll(search) {
        const qb = this.itemRepository.createQueryBuilder('item')
            .leftJoinAndSelect('item.priceHistory', 'priceHistory');
        if (search) {
            qb.where('item.name ILIKE :search', { search: `%${search}%` });
        }
        const items = await qb.getMany();
        return items.map(item => {
            const sortedHistory = [...item.priceHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
            const activePrice = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price) : 0;
            return {
                id: item.id,
                name: item.name,
                ingredients: item.ingredients,
                bestBeforeDays: item.bestBeforeDays,
                imageUrl: item.imageUrl,
                activePrice,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            };
        });
    }
    async findOne(id) {
        const item = await this.itemRepository.findOne({
            where: { id },
            relations: { priceHistory: true },
        });
        if (!item) {
            throw new common_1.NotFoundException(`Item with ID ${id} not found`);
        }
        return item;
    }
    async create(data) {
        const item = new item_entity_1.Item();
        item.name = data.name;
        item.ingredients = data.ingredients || [];
        item.bestBeforeDays = data.bestBeforeDays;
        item.imageUrl = data.imageUrl ?? null;
        const savedItem = await this.itemRepository.save(item);
        const priceHist = new item_price_history_entity_1.ItemPriceHistory();
        priceHist.item = savedItem;
        priceHist.price = data.price;
        await this.priceHistoryRepository.save(priceHist);
        return {
            ...savedItem,
            activePrice: data.price,
        };
    }
    async update(id, data) {
        const item = await this.findOne(id);
        if (data.name !== undefined)
            item.name = data.name;
        if (data.ingredients !== undefined)
            item.ingredients = data.ingredients;
        if (data.bestBeforeDays !== undefined)
            item.bestBeforeDays = data.bestBeforeDays;
        if (data.imageUrl !== undefined)
            item.imageUrl = data.imageUrl ?? null;
        const savedItem = await this.itemRepository.save(item);
        const sortedHistory = [...item.priceHistory].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());
        const activePrice = sortedHistory.length > 0 ? parseFloat(sortedHistory[0].price) : 0;
        let updatedActivePrice = activePrice;
        if (data.price !== undefined && data.price !== activePrice) {
            const priceHist = new item_price_history_entity_1.ItemPriceHistory();
            priceHist.item = savedItem;
            priceHist.price = data.price;
            await this.priceHistoryRepository.save(priceHist);
            updatedActivePrice = data.price;
        }
        return {
            ...savedItem,
            activePrice: updatedActivePrice,
        };
    }
    async remove(id) {
        const item = await this.findOne(id);
        await this.itemRepository.remove(item);
    }
    async getPriceHistory(id) {
        const item = await this.findOne(id);
        return this.priceHistoryRepository.find({
            where: { item: { id: item.id } },
            order: { changedAt: 'ASC' },
        });
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(item_entity_1.Item)),
    __param(1, (0, typeorm_1.InjectRepository)(item_price_history_entity_1.ItemPriceHistory)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], ItemsService);
//# sourceMappingURL=items.service.js.map