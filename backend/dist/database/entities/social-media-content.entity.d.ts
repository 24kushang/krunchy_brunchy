export declare class SocialMediaContent {
    id: string;
    title: string;
    caption: string;
    scheduledAt: Date;
    mediaUrl: string | null;
    platforms: string[];
    checklist: Record<string, boolean>;
    createdAt: Date;
    updatedAt: Date;
}
