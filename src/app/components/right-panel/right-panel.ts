import { Observable } from 'rxjs';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageType } from '@openim/client-sdk';
import { FileSizePipe } from "../../core/pipes/file.size";
import { UtilityHelper } from '../../core/utility.helper';
import { ChatService } from '../../services/openim.service';
import { MessageDto } from '../../core/domains/message.dto';
import { TimestampPipe } from "../../core/pipes/timestamp";
import { GroupMemberDto, RoomDto } from '../../core/domains/room.dto';
import { ImageViewerService } from '../../services/image.viewer.service';
import { VideoViewerService } from '../../services/video.viewer.service';
import { LayoutState, PositionState } from '../../core/domains/result.api';

@Component({
    standalone: true,
    selector: 'app-right-panel',
    styleUrls: ['./right-panel.css'],
    templateUrl: './right-panel.html',
    imports: [CommonModule, FormsModule, FileSizePipe, TimestampPipe],
})
export class RightPanelComponent {
    MessageType = MessageType;
    activeStatus: boolean = false;
    activeUserPopup: boolean = false;
    selectedRoom$: Observable<RoomDto | null>;
    selectedUser: GroupMemberDto | null = null;
    avatarDefault: string = UtilityHelper.avatarDefault;

    ticketStatus = 'open';
    LayoutState = LayoutState;
    ticketPriority = 'normal';
    ticketType = 'shipment-tracking';
    ticketSubject = 'Overseas shipment tracking';

    expandedCategories: { [key: string]: boolean } = {
        media: false,
        images: true,
        documents: false
    };
    mediaFiles: MessageDto[] = [];
    imageFiles: MessageDto[] = [];
    documentFiles: MessageDto[] = [];

    constructor(
        public chatService: ChatService,
        public imageService: ImageViewerService,
        public videoService: VideoViewerService) {
        this.selectedRoom$ = this.chatService.selectedRoom$;
        this.selectedRoom$.subscribe(async () => {
            this.resetStates();
            await this.loadAllMessages();
        });
    }

    private resetStates() {
        this.imageFiles = [];
        this.mediaFiles = [];
        this.documentFiles = [];
    }

    hideStatus() {
        this.activeStatus = false;
    }

    toggleStatus(): void {
        this.activeStatus = !this.activeStatus;
    }
    async changeStatus(status: string) {
        this.activeStatus = false;
        switch (status) {
            case 'open':
                await this.chatService.openGroup(this.chatService.currentRoom.groupID);
                break;
            case 'close':
                await this.chatService.closeGroup(this.chatService.currentRoom.groupID);
                break;
        }
    }

    toggleChat(layout: LayoutState) {
        this.chatService.layoutState$.next(layout);
        if (layout == LayoutState.Maximize) {
            this.chatService.positionState$.next(PositionState.Widget);
        }
    }

    closeUserPopup(): void {
        this.selectedUser = null;
        this.activeUserPopup = false;
    }
    viewUser(user: GroupMemberDto): void {
        this.selectedUser = user;
        this.activeUserPopup = true;
    }

    toggleCategory(category: string): void {
        console.log('Toggling category:', category);
        if (this.expandedCategories.hasOwnProperty(category)) {
            this.expandedCategories[category] = !this.expandedCategories[category];
            console.log('New state:', this.expandedCategories[category]);
        }
    }

    viewMedia(media: MessageDto): void {
        if (media.videoElem) {
            let url = media.videoElem.videoUrl;
            let videos = this.mediaFiles.map(c => c.videoElem.videoUrl);
            this.videoService.open(videos, videos.indexOf(url));
        }
    }

    viewImage(image: MessageDto): void {
        if (image.pictureElem) {
            let url = image.pictureElem.sourcePicture.url;
            let images = this.imageFiles.map(c => c.pictureElem.sourcePicture.url);
            this.imageService.open(images, images.indexOf(url));
        }
    }

    viewDocument(doc: MessageDto): void {
        console.log('View document:', doc);
    }

    downloadFile(doc: MessageDto): void {
        console.log('Download file:', doc);
    }

    addMember(): void {
        console.log('Add member clicked');
        // Implement add member functionality
        alert('Add member functionality would be implemented here');
    }

    private async loadAllMessages() {
        let isLoading = false;
        let oldestMessageID = '';
        let hasMoreMessages = true;
        if (isLoading) {
            return;
        }
        if (!this.chatService.currentRoom) return;

        isLoading = true;
        try {
            while (hasMoreMessages) {
                // Sử dụng await trực tiếp để lấy kết quả
                const messages: MessageDto[] = await this.chatService.getHistoryMessages(
                    this.chatService.currentRoom.conversationID,
                    oldestMessageID,
                    100 // Giảm batch size xuống để ổn định hơn
                );

                if (messages && messages.length > 0) {
                    oldestMessageID = messages[0].clientMsgID;

                    // files
                    const files = messages.filter(c => c.contentType === MessageType.FileMessage);
                    this.documentFiles.push(...files);

                    // videos
                    const videos = messages.filter(c => c.contentType === MessageType.VideoMessage);
                    this.mediaFiles.push(...videos);

                    // images
                    const images = messages.filter(c => c.contentType === MessageType.PictureMessage);
                    this.imageFiles.push(...images);

                    // Nếu API trả về ít hơn số lượng yêu cầu, nghĩa là đã hết tin nhắn
                    if (messages.length < 100) {
                        hasMoreMessages = false;
                    }
                } else {
                    // Không còn tin nhắn để tải
                    hasMoreMessages = false;
                }
            }
        } catch (error) {
            console.error("Failed to load all messages:", error);
            // Có thể hiển thị thông báo lỗi cho người dùng ở đây
        } finally {
            isLoading = false; // Đảm bảo cờ được reset dù thành công hay thất bại
        }
    }
}
