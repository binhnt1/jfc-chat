import { ImageDimensions } from "./domains/image.data";

export class UtilityHelper {
    public static emojiList = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
        '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
        '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
        '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉',
        '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏',
        '🙌', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿',
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐'
    ];
    public static avatarDefault: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTYiIGZpbGw9IiMzQjgyRjYiLz4KPHN2ZyB4PSI2IiB5PSI2IiB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0yMCAyMVYxOUE0IDQgMCAwIDAgMTYgMTVIOEE0IDQgMCAwIDAgNCAyMFYyMSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPGNpcmNsZSBjeD0iMTIiIGN5PSI3IiByPSI0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4KPC9zdmc+';

    
    public static createUniqueId() {
        const timestamp = Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return timestamp;
    }

    public static getRandomDarkColor() {
        const hue = Math.floor(Math.random() * 361);
        const lightness = Math.floor(Math.random() * 31) + 25;
        const saturation = Math.floor(Math.random() * 31) + 70;
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    public static getRandomElement(arr: any[]) {
        if (!Array.isArray(arr) || arr.length === 0) {
            return undefined;
        }
        const randomIndex = Math.floor(Math.random() * arr.length);
        return arr[randomIndex];
    }
    
    public static isImageFile(file: File): boolean {
        const validTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp'
        ];
        return validTypes.includes(file.type.toLowerCase());
    }

    public static formatFileSize(bytes: number): string {
        if (bytes === 0) return '0 Bytes';

        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    public static getImageDimensions(file: File): Promise<ImageDimensions> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight
                });
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    public static validateImageFile(file: File, maxSizeBytes: number = 5 * 1024 * 1024): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                // Check file type
                if (!this.isImageFile(file)) {
                    reject(new Error('Invalid image file type'));
                    return;
                }

                // Check file size
                if (file.size > maxSizeBytes) {
                    reject(new Error(`Image size exceeds ${this.formatFileSize(maxSizeBytes)} limit`));
                    return;
                }

                // Check image dimensions
                const dimensions = await this.getImageDimensions(file);

                // Reasonable dimension limits
                const maxDimension = 10000; // 10k pixels
                if (dimensions.width > maxDimension || dimensions.height > maxDimension) {
                    reject(new Error(`Image dimensions too large (max: ${maxDimension}px)`));
                    return;
                }

                resolve(true);

            } catch (error) {
                reject(error);
            }
        });
    }
}