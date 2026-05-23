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
exports.SocialMediaService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const social_media_content_entity_1 = require("../../database/entities/social-media-content.entity");
let SocialMediaService = class SocialMediaService {
    socialMediaRepository;
    constructor(socialMediaRepository) {
        this.socialMediaRepository = socialMediaRepository;
    }
    async findAll() {
        return this.socialMediaRepository.find({
            order: { scheduledAt: 'ASC' },
        });
    }
    async findOne(id) {
        const post = await this.socialMediaRepository.findOne({ where: { id } });
        if (!post) {
            throw new common_1.NotFoundException(`Social media post with ID ${id} not found`);
        }
        return post;
    }
    async create(data) {
        const post = new social_media_content_entity_1.SocialMediaContent();
        post.title = data.title;
        post.caption = data.caption;
        post.scheduledAt = new Date(data.scheduledAt);
        post.mediaUrl = data.mediaUrl || null;
        post.platforms = data.platforms;
        post.checklist = data.checklist || {
            'Graphic Design': false,
            'Caption Drafted': false,
            'Approval': false,
            'Published': false,
        };
        return this.socialMediaRepository.save(post);
    }
    async update(id, data) {
        const post = await this.findOne(id);
        if (data.title !== undefined)
            post.title = data.title;
        if (data.caption !== undefined)
            post.caption = data.caption;
        if (data.scheduledAt !== undefined)
            post.scheduledAt = new Date(data.scheduledAt);
        if (data.mediaUrl !== undefined)
            post.mediaUrl = data.mediaUrl;
        if (data.platforms !== undefined)
            post.platforms = data.platforms;
        if (data.checklist !== undefined)
            post.checklist = data.checklist;
        return this.socialMediaRepository.save(post);
    }
    async remove(id) {
        const post = await this.findOne(id);
        await this.socialMediaRepository.remove(post);
    }
};
exports.SocialMediaService = SocialMediaService;
exports.SocialMediaService = SocialMediaService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(social_media_content_entity_1.SocialMediaContent)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SocialMediaService);
//# sourceMappingURL=social-media.service.js.map