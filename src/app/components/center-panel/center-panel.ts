import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageType } from '@openim/client-sdk';
import { filter, Observable, Subscription } from 'rxjs';
import { ToastrHelper } from '../../core/toastr.helper';
import { DurationPipe } from "../../core/pipes/duration";
import { FileSizePipe } from "../../core/pipes/file.size";
import { UtilityHelper } from '../../core/utility.helper';
import { TimestampPipe } from "../../core/pipes/timestamp";
import { ChatService } from '../../services/openim.service';
import { GroupMemberDto, RoomDto } from '../../core/domains/room.dto';
import { VideoViewerService } from '../../services/video.viewer.service';
import { ImageViewerService } from '../../services/image.viewer.service';
import { LayoutState, PositionState } from '../../core/domains/result.api';
import { GroupMessage, GroupMessageType, MessageDto } from '../../core/domains/message.dto';
import { AfterViewChecked, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';

export interface Attachment {
    id: string;
    url: string;
    name: string;
    size?: number;
    type: 'image' | 'document' | 'video';
}

export interface SelectedFile {
    file: File;
    name: string;
    size: number;
    preview?: string;
    duration?: number;
    thumbnailFile?: File;
    isUploading?: boolean;
    type: 'image' | 'document' | 'video';
}

@Component({
    standalone: true,
    selector: 'app-center-panel',
    templateUrl: './center-panel.html',
    styleUrls: ['./center-panel.scss'],
    imports: [CommonModule, FormsModule, FileSizePipe, DurationPipe, TimestampPipe],
})
export class CenterPanelComponent implements OnInit, OnDestroy, AfterViewChecked {
    @ViewChild('imageInput') imageInput!: ElementRef;
    @ViewChild('videoInput') videoInput!: ElementRef;
    @ViewChild('documentInput') documentInput!: ElementRef;
    @ViewChild('messagesContainer') messagesContainer!: ElementRef;
    @ViewChild('audioPreview') audioPreview!: ElementRef<HTMLAudioElement>;

    messageText = '';
    showEmojiPicker = false;
    LayoutState = LayoutState;
    showUserSuggestions = false;
    selectedFiles: SelectedFile[] = [];
    selectedRoom$: Observable<RoomDto | null>;

    // File size limits
    readonly MAX_SIZE = 2 * 1024 * 1024; // 2MB

    // Emoji list for picker
    emojiList = UtilityHelper.emojiList;

    // Reaction emojis for message reactions
    reactionEmojis = [
        { emoji: '❤️', name: 'Love' },
        { emoji: '👍', name: 'Like' },
        { emoji: '😊', name: 'Happy' },
        { emoji: '😢', name: 'Sad' },
        { emoji: '😮', name: 'Surprised' },
        { emoji: '😡', name: 'Angry' }
    ];
    activeReactionGroup: GroupMessage | null = null;

    // Sample users for @tag functionality
    public isLoadingMore = false;
    public isLoadingHistory = false;
    public MessageType = MessageType;
    public messages: MessageDto[] = [];
    private shouldScrollToBottom = false;
    public availableUsers: GroupMemberDto[];
    public errorMessage: string | null = null;
    public GroupMessageType = GroupMessageType;
    public filteredUsers: GroupMemberDto[] = [];
    public groupedMessages: GroupMessage[] = [];

    private typingTimer: any;
    private noMoreOldMessages = false;
    private messageSubscription!: Subscription;
    private inputStatusSubscription!: Subscription;
    private oldestMessageID: string | null = null;

    // Typing indicator for current conversation
    isOtherUserTyping = false;
    typingUserName: string | null = null;

    contextMenuX = 0;
    contextMenuY = 0;
    isContextMenuVisible = false;
    contextMenuMessage: GroupMessage = null;
    replyingToMessage: MessageDto | null = null;

    // Audio recording properties
    isRecording = false;
    recordingDuration = 0;
    audioSupported = false;
    isAudioPlaying = false;
    audioPreviewUrl: string | null = null;
    private recordingTimer: any;
    private recordingStartTime = 0;
    private audioChunks: Blob[] = [];
    private mediaStream: MediaStream | null = null;
    private mediaRecorder: MediaRecorder | null = null;
    recordedAudio: { file: File; duration: number } | null = null;

    // Members popup properties
    activeMembersPopup: boolean = false;
    activeMemberDetailPopup: boolean = false;
    selectedMember: GroupMemberDto | null = null;
    avatarDefault: string = UtilityHelper.avatarDefault;

    public get currentUserID(): string {
        return this.chatService.currentUserID;
    }

    @HostListener('document:click')
    onDocumentClick(): void {
        if (this.isContextMenuVisible) {
            this.isContextMenuVisible = false;
        }
    }

    constructor(
        public chatService: ChatService,
        public imageService: ImageViewerService,
        public videoService: VideoViewerService) {
        this.selectedRoom$ = this.chatService.selectedRoom$;
    }

    ngOnInit(): void {
        // Check audio recording support
        this.checkAudioSupport();

        // Lắng nghe tin nhắn mới đến
        this.messageSubscription = this.chatService.newMessageHandler$
            .pipe(filter((msg): msg is MessageDto[] => msg !== null))
            .subscribe((newMessages: MessageDto[]) => {
                if (!this.chatService.currentRoom) return;
                if (!newMessages || newMessages.length === 0) return;

                newMessages.forEach((message: MessageDto) => {
                    let belongsToCurrentRoom = false;
                    if (this.chatService.currentRoom.groupID) {
                        if (message.groupID === this.chatService.currentRoom.groupID) {
                            belongsToCurrentRoom = true;
                        }
                    } else {
                        // const myUserID = this.chatService.currentUserID;
                        // const otherUserID = this.chatService.currentRoom.userID;

                        // // Tin nhắn thuộc về cuộc trò chuyện này nếu người gửi và người nhận
                        // // là tôi và người kia (bất kể chiều nào).
                        // const isCorrectPairing =
                        //     (newMessage.sendID === myUserID && newMessage.recvID === otherUserID) ||
                        //     (newMessage.sendID === otherUserID && newMessage.recvID === myUserID);

                        // if (isCorrectPairing) {
                        //     belongsToCurrentRoom = true;
                        // }
                    }

                    if (belongsToCurrentRoom) {
                        const messageExists = this.messages.some(m => m.clientMsgID === message.clientMsgID);
                        if (!messageExists) {
                            this.messages.push(message);
                            this.recalculateMessageGroups();
                            this.shouldScrollToBottom = true;
                        }
                    }
                });
            });
        this.selectedRoom$.subscribe(() => {
            this.resetInputs();
            this.resetChatState();
            this.typingUserName = null;
            this.isOtherUserTyping = false;
            if (this.chatService.currentRoom) {
                this.availableUsers = this.chatService.currentRoom.members;
                this.loadInitialMessages(this.chatService.currentRoom.conversationID);
            }
        });

        // Listen for typing status from other users
        this.inputStatusSubscription = this.chatService.inputStatusHandler$.subscribe((data) => {
            if (!data || !this.chatService.currentRoom) return;
            if (data.conversationID === this.chatService.currentRoom.conversationID) {
                this.isOtherUserTyping = data.platformIDs && data.platformIDs.length > 0;
                if (this.isOtherUserTyping && data.userID && this.availableUsers) {
                    const user = this.availableUsers.find(u => u.userID === data.userID);
                    this.typingUserName = user?.nickname || user?.userID || 'Someone';
                } else {
                    this.typingUserName = null;
                }
                this.shouldScrollToBottom = true;
            }
        });
    }

    ngOnDestroy(): void {
        if (this.messageSubscription) {
            this.messageSubscription.unsubscribe();
            this.messageSubscription = null;
        }
        if (this.inputStatusSubscription) {
            this.inputStatusSubscription.unsubscribe();
            this.inputStatusSubscription = null;
        }
    }

    ngAfterViewChecked() {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
            const intervalId = setInterval(() => {
                this.scrollToBottom();
            }, 100);
            setTimeout(() => {
                clearInterval(intervalId);
            }, 3000);
        }
    }

    toggleChat(layout: LayoutState) {
        this.chatService.layoutState$.next(layout);
        if (layout == LayoutState.Maximize) {
            this.chatService.positionState$.next(PositionState.Widget);
        }
    }

    async recallMessage(): Promise<void> {
        if (!this.contextMenuMessage) return;

        this.contextMenuMessage.items.forEach(async (message: MessageDto) => {
            await this.chatService.revokeMessage({
                clientMsgID: message.clientMsgID,
                conversationID: this.chatService.currentRoom.conversationID,
            });
            message.contentType = MessageType.RevokeMessage;
        });
        this.isContextMenuVisible = false; // Đóng menu sau khi thực hiện
    }

    replyMessage(message: MessageDto): void {
        this.replyingToMessage = message;
        this.isContextMenuVisible = false;
        // Focus vào input để user có thể gõ reply ngay
        setTimeout(() => {
            const inputElement = document.querySelector('.message-input') as HTMLInputElement;
            if (inputElement) {
                inputElement.focus();
            }
        }, 100);
    }

    cancelReply(): void {
        this.replyingToMessage = null;
    }

    getReplyPreviewText(message: MessageDto): string {
        switch (message.contentType) {
            case MessageType.TextMessage:
                return message.textElem?.content || '';
            case MessageType.PictureMessage:
                return '📷 Photo';
            case MessageType.VideoMessage:
                return '🎥 Video';
            case MessageType.FileMessage:
                return `📄 ${message.fileElem?.fileName || 'File'}`;
            default:
                return 'Message';
        }
    }

    public onMessageInput(event: any): void {
        const text = event.target.value;
        this.messageText = text;

        // Check for @ mentions
        const lastAtIndex = text.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const searchTerm = text.substring(lastAtIndex + 1).toLowerCase();
            if (searchTerm.length > 0) {
                this.filteredUsers = this.availableUsers.filter(user =>
                    user.userID.toLowerCase().includes(searchTerm)
                );
                this.showUserSuggestions = this.filteredUsers.length > 0;
            } else {
                this.filteredUsers = this.availableUsers;
                this.showUserSuggestions = true;
            }
        } else {
            this.showUserSuggestions = false;
        }

        if (this.typingTimer)
            clearTimeout(this.typingTimer);
        this.chatService.sendTypingStatus(this.chatService.currentRoom.conversationID);
    }

    public async sendMessage(): Promise<void> {
        let requestId = UtilityHelper.createUniqueId();
        if (!this.canSendMessage() || !this.chatService.currentRoom) {
            return;
        }

        // Create a list of promises for all messages to be sent
        const sendPromises: Promise<void>[] = [];

        // Add text message promise if text exists
        if (this.messageText.trim()) {
            // Check if replying to a message
            if (this.replyingToMessage) {
                sendPromises.push(this.chatService.sendReplyMessage({
                    requestId: requestId,
                    text: this.messageText,
                    replyItem: this.replyingToMessage,
                    groupID: this.chatService.currentRoom.groupID,
                }));
            } else {
                sendPromises.push(this.chatService.sendTextMessage({
                    requestId: requestId,
                    text: this.messageText,
                    groupID: this.chatService.currentRoom.groupID
                }));
            }
        }

        // Add file message promises
        for (const file of this.selectedFiles) {
            const options: any = {
                file: file.file,
                requestId: requestId,
                groupID: this.chatService.currentRoom.groupID,
            };
            if (file.type === 'image') {
                file.isUploading = true;
                sendPromises.push(this.chatService.sendImageMessage(options));
            } if (file.type === 'video') {
                file.isUploading = true;
                sendPromises.push(this.chatService.sendVideoMessage({
                    file: file.file,
                    requestId: requestId,
                    duration: file.duration,
                    thumbnail: file.thumbnailFile,
                    groupID: this.chatService.currentRoom.groupID,
                }));
            } else {
                file.isUploading = true;
                sendPromises.push(this.chatService.sendFileMessage(options));
            }
        }

        // Add audio message promise if recorded
        if (this.recordedAudio) {
            sendPromises.push(this.chatService.sendSoundMessage({
                requestId: requestId,
                file: this.recordedAudio.file,
                duration: this.recordedAudio.duration,
                groupID: this.chatService.currentRoom.groupID,
            }));
        }

        // Reset inputs immediately for a better UX
        try {
            await Promise.all(sendPromises).then((data: any) => {
                this.resetInputs();
                this.messages.push(...data);
                this.recalculateMessageGroups();
                this.shouldScrollToBottom = true;
            });
        } catch (error) {
            this.resetInputs();
            this.shouldScrollToBottom = true;
            this.errorMessage = "One or more messages failed to send.";
        }
    }

    public getAvatarColor(name: string): string {
        if (!name) {
            return '#CCCCCC'; // Default gray color if name is missing
        }

        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            // Simple hash function
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Use HSL colors for better aesthetics
        const hue = hash % 360;
        // Adjust saturation and lightness for nice pastel-like colors
        const saturation = 70; // %
        const lightness = 40;  // %

        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    public async onScroll(event: any): Promise<void> {
        if (event.target.scrollTop === 0) {
            await this.loadMoreMessages();
        }
    }

    public scrollToMessage(clientMsgID: string | undefined): void {
        if (!clientMsgID) return;

        const messageElement = document.querySelector(`[data-message-id="${clientMsgID}"]`);
        if (messageElement) {
            messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Add highlight effect
            messageElement.classList.add('highlight-message');
            setTimeout(() => {
                messageElement.classList.remove('highlight-message');
            }, 2000);
        }
    }

    // Toggle reaction picker for a message
    public toggleReactionPicker(group: GroupMessage): void {
        if (this.activeReactionGroup === group) {
            this.activeReactionGroup = null;
        } else {
            this.activeReactionGroup = group;
        }
    }

    // Send reaction (placeholder - will send customMessage later)
    public sendReaction(group: GroupMessage, reaction: { emoji: string; name: string }): void {
        console.log('Reaction selected:', reaction.emoji, 'for message:', group.items[0]?.clientMsgID);
        // TODO: Implement customMessage sending for reactions
        this.activeReactionGroup = null;
    }

    // Close reaction picker when clicking outside
    @HostListener('document:click', ['$event'])
    onTriggerDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.reaction-trigger') && this.activeReactionGroup) {
            this.activeReactionGroup = null;
        }
    }

    public viewAttachment(message: MessageDto): void {
        let url: string = '';
        let fileName: string = 'download';

        switch (message.contentType) {
            case MessageType.PictureMessage:
                if (message.pictureElem) {
                    url = message.pictureElem.sourcePicture.url;
                    let images = this.messages.filter(c => c.contentType == MessageType.PictureMessage).map(c => c.pictureElem.sourcePicture.url);
                    this.imageService.open(images, images.indexOf(url));
                    return;
                }
                break;
            case MessageType.VideoMessage:
                if (message.videoElem) {
                    url = message.videoElem.videoUrl;
                    let videos = this.messages.filter(c => c.contentType == MessageType.VideoMessage).map(c => c.videoElem.videoUrl);
                    this.videoService.open(videos, videos.indexOf(url));
                    return;
                }
                break;

            case MessageType.FileMessage:
                if (message.fileElem) {
                    url = message.fileElem.sourceUrl;
                    fileName = message.fileElem.fileName;
                }
                break;
        }

        if (!url) {
            alert("Attachment data is missing.");
            return;
        }
        if (url) window.open(url, '_blank');
    }

    public async sendLocationMessage(): Promise<void> {
        if (!navigator.geolocation) {
            ToastrHelper.Error('Geolocation is not supported by your browser', 'Error');
            return;
        }

        ToastrHelper.Success('Getting your location...', 'Please wait');
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const label = `Lat: ${latitude}, Lng: ${longitude}`;
                if (!this.chatService.currentRoom) return;

                try {
                    const requestId = UtilityHelper.createUniqueId();
                    const sentMessages = await this.chatService.sendLocationMessage({
                        description: label,
                        latitude: latitude,
                        longitude: longitude,
                        requestId: requestId,
                        groupID: this.chatService.currentRoom.groupID
                    });

                    this.messages.push(...sentMessages);
                    this.recalculateMessageGroups();
                    this.shouldScrollToBottom = true;

                    ToastrHelper.Success('Location sent successfully', 'Success');
                } catch (error) {
                    ToastrHelper.Error('Failed to send location', 'Error');
                }
            },
            (error) => {
                let errorMessage = 'Unable to retrieve your location';
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = 'Location permission denied';
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = 'Location information unavailable';
                        break;
                    case error.TIMEOUT:
                        errorMessage = 'Location request timed out';
                        break;
                }
                ToastrHelper.Error(errorMessage, 'Error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    }

    public openLocation(lat: number, lng: number): void {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, '_blank');
    }

    public downloadAttachment(message: MessageDto): void {
        let url: string = '';
        let fileName: string = 'download';

        switch (message.contentType) {
            case MessageType.PictureMessage:
                if (message.pictureElem) {
                    url = message.pictureElem.sourcePicture.url;
                    fileName = message.pictureElem.sourcePicture.uuid + '.jpg';
                }
                break;

            case MessageType.VideoMessage:
                if (message.videoElem) {
                    url = message.videoElem.videoUrl;
                    fileName = message.videoElem.videoUUID + '.mp4';
                }
                break;

            case MessageType.FileMessage:
                if (message.fileElem) {
                    url = message.fileElem.sourceUrl;
                    fileName = message.fileElem.fileName;
                }
                break;
        }

        if (!url) {
            alert("Attachment data is missing.");
            return;
        }

        // Logic tải file giữ nguyên
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    onMessageRightClick(event: MouseEvent, message: GroupMessage): void {
        event.preventDefault();
        event.stopPropagation();

        this.contextMenuMessage = message;
        this.contextMenuX = event.clientX;
        this.contextMenuY = event.clientY;
        this.isContextMenuVisible = true;
    }

    selectUser(user: GroupMemberDto): void {
        const lastAtIndex = this.messageText.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const beforeAt = this.messageText.substring(0, lastAtIndex);
            this.messageText = beforeAt + '@' + user.userID + ' ';
        }
        this.showUserSuggestions = false;
    }

    canSendMessage(): boolean {
        return this.messageText.trim().length > 0 || this.selectedFiles.length > 0 || this.recordedAudio !== null;
    }

    onImageSelect(): void {
        if (this.imageInput && this.imageInput.nativeElement) {
            this.imageInput.nativeElement.click();
        }
    }
    onVideoSelect(): void {
        if (this.videoInput && this.videoInput.nativeElement) {
            this.videoInput.nativeElement.click();
        }
    }
    onDocumentSelect(): void {
        if (this.documentInput && this.documentInput.nativeElement) {
            this.documentInput.nativeElement.click();
        }
    }
    toggleEmojiPicker(): void {
        this.showEmojiPicker = !this.showEmojiPicker;
        // Hide user suggestions when showing emoji picker
        if (this.showEmojiPicker) {
            this.showUserSuggestions = false;
        }
    }
    selectEmoji(emoji: string): void {
        this.messageText += emoji;
        this.showEmojiPicker = false;
    }
    onPaste(event: ClipboardEvent): void {
        const items = event.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];

            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    // Validate image size
                    if (file.size > this.MAX_SIZE) {
                        ToastrHelper.Error(`Pasted image is too large. Maximum size is 5MB.`, 'Error');
                        continue;
                    }

                    const selectedFile: SelectedFile = {
                        file: file,
                        name: `pasted-image-${Date.now()}.png`,
                        type: 'image',
                        size: file.size,
                        isUploading: false // Added for consistency
                    };

                    // Create preview
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        selectedFile.preview = e.target?.result as string;
                    };
                    reader.readAsDataURL(file);

                    this.selectedFiles.push(selectedFile);

                    // Prevent default paste behavior
                    event.preventDefault();
                }
            }
        }
    }
    async onFileSelected(event: any, type: 'image' | 'document' | 'video'): Promise<void> {
        const files = Array.from(event.target.files) as File[];
        if (!files.length) return;

        const sizeLabel = '2MB';
        // Note: MAX_SIZE is 5MB from above, but sizeLabel is 2MB. 
        // You might want to make these consistent. Using 2MB for the message as per the original code.
        const maxSizeForThisCheck = 2 * 1024 * 1024;

        for (const file of files) {
            // Validate file size
            if (file.size > maxSizeForThisCheck) {
                ToastrHelper.Error(`File "${file.name}" is too large. Maximum size is ${sizeLabel}.`, 'Error');
                continue;
            }

            // Validate file type
            if (type === 'image' && !file.type.startsWith('image/')) {
                ToastrHelper.Error(`File "${file.name}" is not a valid image.`, 'Error');
                continue;
            }

            const selectedFile: SelectedFile = {
                file: file,
                type: type,
                name: file.name,
                size: file.size,
                isUploading: false // Added for consistency
            };

            // Create preview for images
            if (type === 'image') {
                selectedFile.preview = await this.createImagePreview(file);
            } else if (type === 'video') {
                const metadata = await this.getVideoMetadata(file);
                selectedFile.preview = metadata.thumbnailDataUrl;
                selectedFile.thumbnailFile = metadata.thumbnailFile;
                selectedFile.duration = metadata.duration;
            }
            this.selectedFiles.push(selectedFile);
        }

        // Reset the input
        event.target.value = '';
        this.scrollToBottom();
    }

    clearSelectedFiles(): void {
        this.selectedFiles = [];
    }
    removeSelectedFile(index: number): void {
        this.selectedFiles.splice(index, 1);
    }

    // Helper method to process message text and highlight @mentions
    processMessageText(text: string): string {
        return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
    }

    getFileMessages(group: GroupMessage): MessageDto[] {
        return group.items.filter(m => m.contentType === MessageType.FileMessage);
    }

    getImageMessages(group: GroupMessage): MessageDto[] {
        return group.items.filter(m => m.contentType === MessageType.PictureMessage);
    }

    getVideoMessages(group: GroupMessage): MessageDto[] {
        return group.items.filter(m => m.contentType === MessageType.VideoMessage);
    }

    getRevokedMessages(group: GroupMessage): MessageDto[] {
        return group.items.filter(m => m.contentType === MessageType.RevokeMessage);
    }

    getTextMessage(group: GroupMessage): MessageDto | null {
        return group.items.find(m => m.contentType === MessageType.TextMessage) || null;
    }

    getSoundMessages(group: GroupMessage): MessageDto[] {
        return group.items.filter(m => m.contentType === MessageType.VoiceMessage) || null;
    }

    getQuoteMessage(group: GroupMessage): MessageDto | null {
        return group.items.find(m => m.contentType === MessageType.QuoteMessage) || null;
    }

    getLocationMessage(group: GroupMessage): MessageDto | null {
        return group.items.find(m => m.contentType === MessageType.LocationMessage) || null;
    }

    private resetInputs(): void {
        this.messageText = '';
        this.selectedFiles = [];
        this.replyingToMessage = null;

        // Revoke audio URL if exists
        if (this.audioPreviewUrl) {
            URL.revokeObjectURL(this.audioPreviewUrl);
            this.audioPreviewUrl = null;
        }

        this.recordedAudio = null;
        this.recordingDuration = 0;
        this.isAudioPlaying = false;
    }
    private resetChatState(): void {
        this.messages = [];
        this.errorMessage = null;
        this.isLoadingMore = false;
        this.oldestMessageID = null;
        this.noMoreOldMessages = false;
        this.isLoadingHistory = false;
    }
    private scrollToBottom(): void {
        try {
            this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
        } catch (err) {
            console.error('Could not scroll to bottom:', err);
        }
    }
    private recalculateMessageGroups(): void {
        // Nếu không có tin nhắn, trả về mảng rỗng
        if (!this.messages || this.messages.length === 0) {
            this.groupedMessages = [];
            return;
        }

        const displayGroups: GroupMessage[] = [];
        if (this.messages.length > 0) {
            // Tin nhắn đầu tiên luôn bắt đầu một nhóm mới
            let currentGroup: GroupMessage = {
                items: [this.messages[0]],
                sendID: this.messages[0].sendID,
                isRead: this.messages[0].isRead,
                sendTime: this.messages[0].sendTime,
            };
            displayGroups.push(currentGroup);

            // Lặp qua các tin nhắn còn lại
            for (let i = 1; i < this.messages.length; i++) {
                const message = this.messages[i];
                const prevMessage = this.messages[i - 1];
                if (message.contentType == MessageType.RevokeMessage && prevMessage.contentType == MessageType.RevokeMessage)
                    continue;

                // Kiểm tra xem tin nhắn hiện tại có thể được nhóm với tin nhắn trước đó không
                if (this.canGroupMessages(prevMessage, message)) {
                    currentGroup.items.push(message);
                    currentGroup.isRead = message.isRead;
                    currentGroup.sendTime = message.sendTime;
                } else {
                    // Nếu không, tạo một nhóm mới
                    currentGroup = {
                        items: [message],
                        sendID: message.sendID,
                        isRead: message.isRead,
                        sendTime: message.sendTime,
                    };
                    displayGroups.push(currentGroup);
                }
            }
        }
        this.groupedMessages = displayGroups;
    }
    private async loadMoreMessages(): Promise<void> {
        // Ngăn việc gọi lại khi đang tải hoặc đã hết tin nhắn
        if (this.isLoadingMore || this.noMoreOldMessages || !this.chatService.currentRoom?.conversationID || !this.oldestMessageID) {
            return;
        }

        this.isLoadingMore = true;
        try {
            // Gọi service với ID của tin nhắn cũ nhất hiện tại
            const olderHistory = await this.chatService.getHistoryMessages(
                this.chatService.currentRoom.conversationID,
                this.oldestMessageID
            );
            this.handleNewHistory(olderHistory, true);
            this.messagesContainer.nativeElement.scrollTop = 100;
        } catch (error) {
            this.errorMessage = "Failed to load more messages.";
        } finally {
            this.isLoadingMore = false;
        }
    }
    private createImagePreview(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    }
    private async loadInitialMessages(conversationID: string): Promise<void> {
        this.messages = [];
        this.errorMessage = null;
        this.groupedMessages = [];
        this.isLoadingHistory = true;
        try {
            // Gọi với startClientMsgID rỗng để lấy trang mới nhất
            const histories = await this.chatService.getHistoryMessages(conversationID);
            console.log('Loaded initial messages:', histories);
            this.handleNewHistory(histories);
            this.shouldScrollToBottom = true;
        } catch (error) {
            this.errorMessage = "Failed to load message history.";
        } finally {
            this.isLoadingHistory = false;
        }
    }
    private canGroupMessages(prev: MessageDto, current: MessageDto): boolean {
        let prevRequestId = prev.ex ? (JSON.parse(prev.ex)?.requestId || JSON.parse(prev.ex)?.albumId || JSON.parse(prev.ex)?.albumID) : '';
        let nextRequestId = current.ex ? (JSON.parse(current.ex)?.requestId || JSON.parse(current.ex)?.albumId || JSON.parse(current.ex)?.albumID) : '';
        if (prevRequestId && nextRequestId && prevRequestId === nextRequestId)
            return prev.sendID === current.sendID;
        return false;
    }
    private handleNewHistory(history: MessageDto[], isLoadingMore = false): void {
        if (history.length > 0) {
            this.oldestMessageID = history[0].clientMsgID;
            this.messages = isLoadingMore
                ? [...history, ...this.messages]
                : history;
            this.recalculateMessageGroups();
        } else {
            this.noMoreOldMessages = true;
        }
    }
    private getVideoMetadata(file: File): Promise<{ duration: number, thumbnailFile: File, thumbnailDataUrl: string }> {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
                return reject(new Error('Canvas 2D context is not available.'));
            }

            let duration = 0;

            // Event fires when video metadata (like dimensions and duration) is loaded.
            video.addEventListener('loadedmetadata', () => {
                duration = video.duration;
                // Seek to 1 second to get a representative frame.
                video.currentTime = 1;
            });

            // Event fires when the seek operation is complete.
            video.addEventListener('seeked', () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Get the thumbnail as a data URL for UI preview.
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg');

                // Convert the canvas content to a File object for sending.
                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject(new Error('Canvas to Blob conversion failed.'));
                    }
                    const thumbnailFile = new File([blob], `thumbnail_${file.name}.jpg`, { type: 'image/jpeg' });

                    // Clean up the object URL to free up memory.
                    URL.revokeObjectURL(video.src);

                    resolve({ duration, thumbnailFile, thumbnailDataUrl });
                }, 'image/jpeg');
            });

            // Handle any errors during video loading.
            video.addEventListener('error', (event) => {
                reject(new Error(`Error loading video: ${event.type}`));
                URL.revokeObjectURL(video.src);
            });

            // Start the process by setting the video source.
            video.src = URL.createObjectURL(file);
            video.load();
        });
    }

    // Audio recording methods
    private checkAudioSupport(): void {
        this.audioSupported = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    async toggleRecording(): Promise<void> {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    private async startRecording(): Promise<void> {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Try different MIME types for broader browser support
            const mimeTypes = [
                'audio/webm',
                'audio/webm;codecs=opus',
                'audio/ogg;codecs=opus',
                'audio/mp4'
            ];

            let selectedMimeType = '';
            for (const mimeType of mimeTypes) {
                if (MediaRecorder.isTypeSupported(mimeType)) {
                    selectedMimeType = mimeType;
                    break;
                }
            }

            if (!selectedMimeType) {
                ToastrHelper.Error('No supported audio format found', 'Error');
                return;
            }

            this.mediaRecorder = new MediaRecorder(this.mediaStream, { mimeType: selectedMimeType });
            this.audioChunks = [];
            this.recordingDuration = 0;
            this.recordingStartTime = Date.now();

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: selectedMimeType });
                const duration = Math.floor((Date.now() - this.recordingStartTime) / 1000);

                // Create File object from Blob
                const fileName = `voice-${Date.now()}.${this.getFileExtension(selectedMimeType)}`;
                const audioFile = new File([audioBlob], fileName, { type: selectedMimeType });

                // Create object URL for audio preview
                this.audioPreviewUrl = URL.createObjectURL(audioBlob);

                // Save to recordedAudio for preview
                this.recordedAudio = { file: audioFile, duration: duration };

                // Stop all tracks
                if (this.mediaStream) {
                    this.mediaStream.getTracks().forEach(track => track.stop());
                    this.mediaStream = null;
                }

                // Clear timer
                if (this.recordingTimer) {
                    clearInterval(this.recordingTimer);
                    this.recordingTimer = null;
                }
                this.isRecording = false;
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            // Start duration timer
            this.recordingTimer = setInterval(() => {
                this.recordingDuration = Math.floor((Date.now() - this.recordingStartTime) / 1000);
            }, 1000);
        } catch (error) {
            console.error('Error starting recording:', error);
            ToastrHelper.Error('Failed to start recording. Please check microphone permissions.', 'Error');
            this.isRecording = false;
        }
    }

    async stopRecording(): Promise<void> {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    async deleteRecording(): Promise<void> {
        // If currently recording, stop it first
        if (this.isRecording) {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                // Remove the onstop handler to prevent creating recordedAudio
                this.mediaRecorder.onstop = null;
                this.mediaRecorder.stop();
                this.isRecording = false;
            }

            // Stop media stream
            if (this.mediaStream) {
                this.mediaStream.getTracks().forEach(track => track.stop());
                this.mediaStream = null;
            }
        }

        // Revoke object URL if exists
        if (this.audioPreviewUrl) {
            URL.revokeObjectURL(this.audioPreviewUrl);
            this.audioPreviewUrl = null;
        }

        // Clear recorded audio and reset state
        this.recordedAudio = null;
        this.recordingDuration = 0;
        this.isAudioPlaying = false;

        // Clear timer
        if (this.recordingTimer) {
            clearInterval(this.recordingTimer);
            this.recordingTimer = null;
        }
    }

    toggleAudioPlayback(): void {
        if (!this.audioPreview || !this.audioPreviewUrl) return;

        const audio = this.audioPreview.nativeElement;

        if (this.isAudioPlaying) {
            audio.pause();
            this.isAudioPlaying = false;
        } else {
            audio.play();
            this.isAudioPlaying = true;

            // Reset playing state when audio ends
            audio.onended = () => {
                this.isAudioPlaying = false;
            };
        }
    }

    private getFileExtension(mimeType: string): string {
        const mimeToExt: { [key: string]: string } = {
            'audio/webm': 'webm',
            'audio/webm;codecs=opus': 'webm',
            'audio/ogg;codecs=opus': 'ogg',
            'audio/ogg': 'ogg',
            'audio/mp4': 'm4a',
            'audio/mpeg': 'mp3'
        };
        return mimeToExt[mimeType] || 'webm';
    }

    // Members popup methods
    showMembersPopup(): void {
        this.activeMembersPopup = true;
    }

    closeMembersPopup(): void {
        this.activeMembersPopup = false;
    }

    viewMemberDetail(member: GroupMemberDto): void {
        this.selectedMember = member;
        this.activeMemberDetailPopup = true;
        this.activeMembersPopup = false; // Close members list popup
    }

    closeMemberDetailPopup(): void {
        this.selectedMember = null;
        this.activeMemberDetailPopup = false;
    }
}
