import { BehaviorSubject } from 'rxjs';
import { Injectable } from '@angular/core';

export interface ImageViewerData {
    images: string[];
    currentIndex: number;
}

@Injectable({
    providedIn: 'root'
})
export class ImageViewerService {
    private viewerDataSource = new BehaviorSubject<ImageViewerData | null>(null);
    public viewerData$ = this.viewerDataSource.asObservable();

    open(images: string[], startIndex: number = 0): void {
        if (!images || images.length === 0) {
            console.error("Image viewer: No images provided.");
            return;
        }
        this.viewerDataSource.next({ images, currentIndex: startIndex });
    }
    
    close(): void {
        this.viewerDataSource.next(null);
    }

    next(): void {
        const currentData = this.viewerDataSource.getValue();
        if (currentData) {
            const nextIndex = (currentData.currentIndex + 1) % currentData.images.length;
            this.viewerDataSource.next({ ...currentData, currentIndex: nextIndex });
        }
    }
    
    previous(): void {
        const currentData = this.viewerDataSource.getValue();
        if (currentData) {
            const prevIndex = (currentData.currentIndex - 1 + currentData.images.length) % currentData.images.length;
            this.viewerDataSource.next({ ...currentData, currentIndex: prevIndex });
        }
    }
}