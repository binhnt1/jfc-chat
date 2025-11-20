import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// Interface mới để chứa danh sách video và chỉ số hiện tại
export interface VideoViewerData {
    urls: string[];
    currentIndex: number;
}

@Injectable({
    providedIn: 'root'
})
export class VideoViewerService {
    // BehaviorSubject giờ sẽ giữ đối tượng VideoViewerData
    private viewerDataSource = new BehaviorSubject<VideoViewerData | null>(null);

    // Observable để các component khác có thể lắng nghe
    public viewerData$ = this.viewerDataSource.asObservable();

    /**
     * Mở popup trình xem video.
     * @param urls Mảng các URL của video.
     * @param startIndex Chỉ số của video được click để hiển thị đầu tiên.
     */
    open(urls: string[], startIndex: number = 0): void {
        if (!urls || urls.length === 0) {
            console.error("Video viewer: No URLs provided.");
            return;
        }
        this.viewerDataSource.next({ urls, currentIndex: startIndex });
    }

    /**
     * Đóng popup trình xem video.
     */
    close(): void {
        this.viewerDataSource.next(null);
    }

    /**
     * Chuyển đến video tiếp theo trong danh sách.
     */
    next(): void {
        const currentData = this.viewerDataSource.getValue();
        if (currentData) {
            const nextIndex = (currentData.currentIndex + 1) % currentData.urls.length;
            this.viewerDataSource.next({ ...currentData, currentIndex: nextIndex });
        }
    }

    /**
     * Chuyển về video trước đó trong danh sách.
     */
    previous(): void {
        const currentData = this.viewerDataSource.getValue();
        if (currentData) {
            const prevIndex = (currentData.currentIndex - 1 + currentData.urls.length) % currentData.urls.length;
            this.viewerDataSource.next({ ...currentData, currentIndex: prevIndex });
        }
    }
}