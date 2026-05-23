"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const social_media_content_entity_1 = require("../../database/entities/social-media-content.entity");
const social_media_controller_1 = require("./social-media.controller");
const social_media_service_1 = require("./social-media.service");
let SocialMediaModule = class SocialMediaModule {
};
exports.SocialMediaModule = SocialMediaModule;
exports.SocialMediaModule = SocialMediaModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([social_media_content_entity_1.SocialMediaContent])],
        controllers: [social_media_controller_1.SocialMediaController],
        providers: [social_media_service_1.SocialMediaService],
        exports: [social_media_service_1.SocialMediaService],
    })
], SocialMediaModule);
//# sourceMappingURL=social-media.module.js.map