import { CommonModule } from '@angular/common';
import { Observable, Subscription } from 'rxjs';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ImageViewerData, ImageViewerService } from '../../services/image.viewer.service';

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-image-viewer',
    templateUrl: './image.viewer.component.html',
    styleUrls: ['./image.viewer.component.scss'],
})
export class ImageViewerComponent implements OnInit, OnDestroy {

    viewerData$: Observable<ImageViewerData | null>;
    currentImage: string | null = null;
    private subscription: Subscription;

    constructor(public imageViewerService: ImageViewerService) {
        this.viewerData$ = this.imageViewerService.viewerData$;
    }

    ngOnInit(): void {
        this.subscription = this.viewerData$.subscribe(data => {
            if (data) {
                this.currentImage = data.images[data.currentIndex];
            } else {
                this.currentImage = null;
            }
        });
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    // Lắng nghe sự kiện bàn phím trên toàn bộ window
    @HostListener('window:keydown', ['$event'])
    handleKeyboardEvent(event: KeyboardEvent) {
        if (this.currentImage) {
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
        this.imageViewerService.close();
    }

    next(): void {
        this.imageViewerService.next();
    }

    previous(): void {
        this.imageViewerService.previous();
    }

    // Ngăn sự kiện click vào ảnh làm đóng popup
    stopPropagation(event: Event): void {
        event.stopPropagation();
    }
}
