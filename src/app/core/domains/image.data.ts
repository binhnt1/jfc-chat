export interface ImageDimensions {
    width: number;
    height: number;
}

export interface ImageProcessingOptions {
    /**
     * Maximum width for big picture (default: 1920)
     */
    maxBigWidth?: number;

    /**
     * Maximum height for big picture (default: 1080)
     */
    maxBigHeight?: number;

    /**
     * Maximum width for thumbnail (default: 200)
     */
    maxThumbnailWidth?: number;

    /**
     * Maximum height for thumbnail (default: 200)
     */
    maxThumbnailHeight?: number;

    /**
     * JPEG quality for compressed images (0.1 - 1.0, default: 0.8)
     */
    quality?: number;

    /**
     * Whether to maintain aspect ratio (default: true)
     */
    maintainAspectRatio?: boolean;
}