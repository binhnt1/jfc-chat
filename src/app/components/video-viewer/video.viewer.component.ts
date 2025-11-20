import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { VideoViewerData, VideoViewerService } from '../../services/video.viewer.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-video-viewer',
    templateUrl: './video.viewer.component.html',
    styleUrls: ['./video.viewer.component.scss']
})
export class VideoViewerComponent implements OnInit, OnDestroy {

    viewerData$: Observable<VideoViewerData | null>;
    currentVideoUrl: string | null = null;
    private subscription: Subscription;

    constructor(private videoViewerService: VideoViewerService) {
        this.viewerData$ = this.videoViewerService.viewerData$;
    }

    ngOnInit(): void {
        this.subscription = this.viewerData$.subscribe(data => {
            if (data) {
                this.currentVideoUrl = data.urls[data.currentIndex];
            } else {
                this.currentVideoUrl = null;
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    // Lắng nghe sự kiện bàn phím trên toàn bộ window
    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (this.currentVideoUrl) {
            if (event.key === 'Escape') {
                this.close();
            }
            if (event.key === 'ArrowRight') {
                this.next();
            }
            if (event.key === 'ArrowLeft') {
                this.previous();
            }
        }
    }

    close(): void {
        this.videoViewerService.close();
    }

    next(): void {
        this.videoViewerService.next();
    }

    previous(): void {
        this.videoViewerService.previous();
    }

    // Ngăn sự kiện click vào video làm đóng popup
    stopPropagation(event: Event): void {
        event.stopPropagation();
    }
}
