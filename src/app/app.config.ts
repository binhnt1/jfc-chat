import { ApiService } from './services/api.service';
import { ChatService } from './services/openim.service';
import { provideHttpClient } from '@angular/common/http';
import { VideoViewerService } from './services/video.viewer.service';
import { ImageViewerService } from './services/image.viewer.service';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    ApiService, ChatService, 
    ImageViewerService, VideoViewerService,
    provideZoneChangeDetection({ eventCoalescing: true })
  ]
};
