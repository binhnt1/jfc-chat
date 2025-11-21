import { BehaviorSubject } from "rxjs";
import { Injectable } from "@angular/core";
import { ApiService } from "./api.service";
import { OpenIMConfig } from "../config/openim.config";
import { UtilityHelper } from "../core/utility.helper";
import { LayoutState, PositionState } from "../core/domains/result.api";
import { ConversationDto } from "../core/domains/conversation.dto";
import { GroupMemberDto, RoomDto } from "../core/domains/room.dto";
import { ImageDimensions, ImageProcessingOptions } from "../core/domains/image.data";
import { CbEvents, getSDK, MessageItem, MessageType, PicBaseInfo } from '@openim/client-sdk';
import { MessageDto, MessageFileDto, MessageImageDto, MessageLocationDto, MessageReplyDto, MessageSoundDto, MessageTextDto, MessageVideoDto, RevokeMessageDto } from "../core/domains/message.dto";

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private im: any;
    private readonly _rooms = new BehaviorSubject<RoomDto[]>([]);
    readonly rooms$ = this._rooms.asObservable();

    private readonly _selectedRoom = new BehaviorSubject<RoomDto | null>(null);
    public readonly selectedRoom$ = this._selectedRoom.asObservable();

    public adminToken: string = '';
    public currentUserID: string = '';
    public listConversations: ConversationDto[];
    public readonly typingHandler$ = new BehaviorSubject<string>(null);
    public readonly layoutState$ = new BehaviorSubject<LayoutState>(null);
    public readonly positionState$ = new BehaviorSubject<PositionState>(null);
    public readonly newGroupHandler$ = new BehaviorSubject<RoomDto | null>(null);
    public readonly connectionStatus$ = new BehaviorSubject<string>('Not Connected');
    public readonly newMessageHandler$ = new BehaviorSubject<MessageItem[] | null>(null);

    constructor(public service: ApiService) { }

    async init(): Promise<void> {
        this.im = getSDK();
        this.setupEventListeners();
    }

    async login(userId: string) {
        this.currentUserID = userId;
        let token = await this.service.getUserToken(userId);
        return await this.im.login({
            token: token,
            userID: userId,
            wsAddr: OpenIMConfig.wsAddr,
            apiAddr: OpenIMConfig.apiAddr,
            platformID: OpenIMConfig.platformId
        }, UtilityHelper.createUniqueId());
    }

    addRoom(room: RoomDto): void {
        const currentRooms = this._rooms.getValue();
        const updatedRooms = [room, ...currentRooms];
        this._rooms.next(updatedRooms);
    }
    setRooms(rooms: RoomDto[]): void {
        this._rooms.next(rooms);
    }
    setRoomTypingStatus(conversationId: string | null): void {
        const currentRooms = this._rooms.getValue();
        const updatedRooms = currentRooms.map(room => ({
            ...room,
            typing: room.conversationID === conversationId
        }));
        this._rooms.next(updatedRooms);
    }
    updateRoomById(roomId: string, updates: Partial<RoomDto>): void {
        const currentRooms = this._rooms.getValue();
        const roomIndex = currentRooms.findIndex(r => r.groupID === roomId);

        if (roomIndex > -1) {
            const newRooms = [...currentRooms];
            // Hàm này thực hiện shallow merge, nên việc xây dựng object update ở hàm gọi là rất quan trọng
            newRooms[roomIndex] = { ...newRooms[roomIndex], ...updates };
            this._rooms.next(newRooms);
        }
    }

    get currentRoom(): RoomDto | null {
        return this._selectedRoom.getValue();
    }
    public setSelectedRoom(room: RoomDto) {
        this._selectedRoom.next(room);
    }
    public async openGroup(groupId: string) {
        const result = await this.im.setGroupInfo({
            groupID: groupId,
            introduction: 'open'
        }, UtilityHelper.createUniqueId());
        this.updateCurrentRoom({ introduction: 'open' });
        return result;
    }
    public async closeGroup(groupId: string) {
        const result = await this.im.setGroupInfo({
            groupID: groupId,
            introduction: 'close'
        }, UtilityHelper.createUniqueId());
        this.updateCurrentRoom({ introduction: 'close' });
        return result;
    }
    public updateCurrentRoom(updates: Partial<RoomDto>): void {
        const currentRoom = this.currentRoom;
        if (currentRoom) {
            const updatedRoom = {
                ...currentRoom,
                ...updates
            };
            this._selectedRoom.next(updatedRoom);
            this.updateRoomById(currentRoom.groupID, updates);
        }
    }

    public async sendReplyMessage(item: MessageReplyDto) {
        if (!item.text)
            return null;

        const message = await this.im.createQuoteMessage({
            text: item.text,
            message: JSON.stringify(item.replyItem),
        });
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new reply', item.text);

        // send
       if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        return sentMessage.data;
    }
    public async revokeMessage(item: RevokeMessageDto) {
        await this.im.revokeMessage({
            clientMsgID: item.clientMsgID,
            conversationID: item.conversationID,
        });
    }

    public async sendTextMessage(item: MessageTextDto) {
        if (!item.text)
            return null;

        const message = await this.im.createTextMessage(item.text);
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new message', item.text);

        // send
       if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        return sentMessage.data;
    }

    public async sendFileMessage(item: MessageFileDto) {
        if (!item.file)
            return null;

        const message = await this.im.createFileMessageByFile({
            file: item.file,
            fileName: item.file.name,
            fileSize: item.file.size,
            fileType: item.file.type,
            uuid: UtilityHelper.createUniqueId()
        }, OpenIMConfig.platformId);
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new file', item.file.name);

        // send
        if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        let data: MessageDto = sentMessage.data;
        if (data) {
            if (data.contentType == MessageType.FileMessage && data.fileElem) {
                let file: any = data.fileElem;
                data.fileName = file.name;
            }
        }
        return sentMessage.data;
    }

    public async sendSoundMessage(item: MessageSoundDto) {
        if (!item.file)
            return null;

        const message = await this.im.createSoundMessageByFile({
            file: item.file,
            name: item.file.name,
            duration: item.duration,
            dataSize: item.file.size,
            soundType: item.file.type,
            uuid: UtilityHelper.createUniqueId()
        }, OpenIMConfig.platformId);
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new sound', item.file.name);

        // send
        if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        let data: MessageDto = sentMessage.data;
        if (data) {
            if (data.contentType == MessageType.FileMessage && data.fileElem) {
                let file: any = data.fileElem;
                data.fileName = file.name;
            }
        }
        return sentMessage.data;
    }

    public async sendImageMessage(item: MessageImageDto) {
        if (!item.file)
            return null;

        let obj = await this.createImageMessageParams(item.file);
        const message = await this.im.createImageMessageByFile(obj);
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new image', item.file.name);

        // send
        debugger
        if (item.requestId) {
            let exObj: any = {
                albumId: item.requestId,
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        return sentMessage.data;
    }

    public async sendVideoMessage(item: MessageVideoDto) {
        if (!item.file)
            return null;

        const message = await this.im.createVideoMessageByFile({
            videoFile: item.file,
            name: item.file.name,
            videoSize: item.file.size,
            videoType: item.file.type,
            duration: item.duration || 0,
            snapshotFile: item.thumbnail,
            snapShotType: item.thumbnail.type,
            snapShotSize: item.thumbnail.size,
            snapShotName: item.thumbnail.name,
            videoUUID: UtilityHelper.createUniqueId(),
        });
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new file', item.file.name);

        // send
        if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        return sentMessage.data;
    }

    public async sendTypingStatus(conversationID: string) {
        if (this.listConversations && this.listConversations.length > 0) {
            this.listConversations.forEach(async (conversation: ConversationDto) => {
                if (conversation.typing) {
                    if (conversation.conversationID != conversationID) {
                        await this.im.changeInputStates({
                            focus: false,
                            conversationID: conversationID
                        });
                    }
                }
            });
        }
        const sentMessage = await this.im.changeInputStates({
            focus: true,
            conversationID: conversationID
        });
        if (this.listConversations && this.listConversations.length > 0) {
            this.listConversations.forEach((conversation: ConversationDto) => {
                if (conversation.conversationID == conversationID)
                    conversation.typing = true;
            });
        }
        this.typingHandler$.next(conversationID);
        return sentMessage.data;
    }

    public async conversations(): Promise<ConversationDto[]> {
        const result = await this.im.getConversationListSplit({
            offset: 0,
            count: 1000,
        }, OpenIMConfig.platformId);
        return result.data;
    }

    public async sendLocationMessage(item: MessageLocationDto) {
        if (!item.latitude || !item.longitude)
            return null;

        const message = await this.im.createLocationMessage({
            latitude: item.latitude,
            longitude: item.longitude,
            description: item.description,
        });
        const offlinePushInfo = item.offlinePushInfo || this.createPushInfo('You have new message', item.description);

        // send
       if (item.requestId) {
            let exObj: any = {
                requestId: item.requestId,
            };
            message.data.ex = JSON.stringify(exObj);
            message.data.exMap = JSON.stringify(exObj);
        }
        const sentMessage = await this.im.sendMessage({
            message: message.data,
            recvID: item.recvID || '',
            groupID: item.groupID || '',
            offlinePushInfo: offlinePushInfo,
        });
        return sentMessage.data;
    }

    public async markConversationMessageAsRead(conversationID: string) {
        const result = await this.im.markConversationMessageAsRead(conversationID, UtilityHelper.createUniqueId());
        return result;
    }

    public async getGroupMembers(groupId: string): Promise<GroupMemberDto[]> {
        const result = await this.im.getGroupMemberList({
            filter: 0,
            offset: 0,
            count: 1000,
            groupID: groupId,
        }, OpenIMConfig.platformId);
        let items: GroupMemberDto[] = result.data;
        if (items && items.length > 0) {
            items = items.filter(c => c.userID != 'imAdmin');
        }
        return items;
    }

    public async getHistoryMessages(conversationID: string, startClientMsgID: string = '', count: number = 40): Promise<MessageDto[]> {
        const result = await this.im.getAdvancedHistoryMessageList({
            count: count,
            conversationID: conversationID,
            startClientMsgID: startClientMsgID,
        });
        let items: MessageDto[] = result.data.messageList;
        if (items && items.length > 0) {
            items = items
                .filter(c => c.contentType != MessageType.CustomMessage)
                .filter(c => c.contentType != MessageType.GroupCreated);
            items.forEach((item: MessageDto) => {
                if (item.contentType == MessageType.FileMessage && item.fileElem) {
                    let file: any = item.fileElem;
                    item.fileName = file.fileName || file.name;
                }
                if (item.contentType == MessageType.VideoMessage && item.videoElem) {
                    let file: any = item.videoElem;
                    item.fileName = file.fileName || file.name;
                }
                if (item.contentType == MessageType.PictureMessage && item.pictureElem) {
                    let file: any = item.pictureElem;
                    item.fileName = file.fileName || file.name;
                }
            });
        }
        return items;
    }

    private setupEventListeners(): void {
        this.im.on(CbEvents.OnConnecting, () => {
            console.log('OPENIM: OnConnecting');
            this.connectionStatus$.next('Connecting...');
        });
        this.im.on(CbEvents.OnConnectSuccess, () => {
            console.log('OPENIM: Connected');
            this.connectionStatus$.next('Connected');
        });
        this.im.on(CbEvents.OnConnectFailed, () => {
            console.log('OPENIM: Connection Failed');
            this.connectionStatus$.next('Connection Failed');
        });
        this.im.on(CbEvents.OnKickedOffline, () => {
            console.log('OPENIM: Kicked Offline');
            this.connectionStatus$.next('Kicked Offline');
        });
        this.im.on(CbEvents.OnProgress, (eventData: any) => {
            console.log(eventData);
        });
        this.im.on(CbEvents.OnJoinedGroupAdded, (eventData: any) => {
            this.newGroupHandler$.next(eventData.data);
        });
        this.im.on(CbEvents.OnRecvNewMessages, (eventData: any) => {
            let items = eventData.data;
            if (items && items.length > 0) {
                items.forEach((item: MessageDto) => {
                    if (item.contentType == MessageType.FileMessage && item.fileElem) {
                        let file: any = item.fileElem;
                        item.fileName = file.name;
                    }
                });
            }
            this.newMessageHandler$.next(items);
        });
    }
    private createPushInfo(title: string, desc: string, ex: string = '') {
        const offlinePushInfo = {
            ex: ex,
            desc: desc,
            title: title,
            iOSPushSound: '+1',
            iOSBadgeCount: true,
        };
        return offlinePushInfo;
    }

    private async createPicBaseInfo(
        file: File,
        dimensions: ImageDimensions,
        type: 'source' | 'big' | 'thumbnail'
    ): Promise<PicBaseInfo> {

        const uuid = UtilityHelper.createUniqueId();

        // For source image, use original file size
        // For resized images, estimate compressed size
        let estimatedSize = file.size;

        if (type !== 'source') {
            let dimension = await UtilityHelper.getImageDimensions(file);
            const compressionRatio = this.estimateCompressionRatio(file.type, type);
            const dimensionRatio = (dimensions.width * dimensions.height) / (dimension.width * dimension.height);
            estimatedSize = Math.round(file.size * dimensionRatio * compressionRatio);
        }

        return {
            uuid,
            type: file.type,
            size: estimatedSize,
            width: dimensions.width,
            height: dimensions.height,
            url: '' // Will be set after upload
        };
    }
    private estimateCompressionRatio(mimeType: string, type: 'big' | 'thumbnail'): number {
        const baseRatio = type === 'thumbnail' ? 0.3 : 0.7;

        switch (mimeType.toLowerCase()) {
            case 'image/jpeg':
            case 'image/jpg':
                return baseRatio;
            case 'image/png':
                return baseRatio * 1.2; // PNG is usually larger
            case 'image/webp':
                return baseRatio * 0.8; // WebP is more efficient
            default:
                return baseRatio;
        }
    }
    private async createImageMessageParams(file: File, sourcePath: string = '', options: Partial<ImageProcessingOptions> = {}): Promise<any> {

        if (!UtilityHelper.isImageFile(file)) {
            throw new Error('File is not a valid image');
        }

        const DEFAULT_OPTIONS: ImageProcessingOptions = {
            quality: 0.8,
            maxBigWidth: 1920,
            maxBigHeight: 1080,
            maxThumbnailWidth: 200,
            maxThumbnailHeight: 200,
            maintainAspectRatio: true
        };

        const processingOptions = { ...DEFAULT_OPTIONS, ...options };

        try {
            // Get original image dimensions
            const originalDimensions = await UtilityHelper.getImageDimensions(file);

            // Create source picture info (original)
            const sourcePicture = await this.createPicBaseInfo(
                file,
                originalDimensions,
                'source'
            );

            // Create big picture info (resized for display)
            const bigDimensions = this.calculateResizedDimensions(
                originalDimensions,
                processingOptions.maxBigWidth!,
                processingOptions.maxBigHeight!,
                processingOptions.maintainAspectRatio!
            );

            const bigPicture = await this.createPicBaseInfo(
                file,
                bigDimensions,
                'big'
            );

            // Create thumbnail info (small preview)
            const thumbnailDimensions = this.calculateResizedDimensions(
                originalDimensions,
                processingOptions.maxThumbnailWidth!,
                processingOptions.maxThumbnailHeight!,
                processingOptions.maintainAspectRatio!
            );

            const snapshotPicture = await this.createPicBaseInfo(
                file,
                thumbnailDimensions,
                'thumbnail'
            );

            return {
                file,
                sourcePath,
                bigPicture,
                sourcePicture,
                snapshotPicture,
                operationID: UtilityHelper.createUniqueId(),
            };

        } catch (error) {
            console.error('Failed to create image message params:', error);
            throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    private calculateResizedDimensions(original: ImageDimensions, maxWidth: number, maxHeight: number, maintainAspectRatio: boolean = true): ImageDimensions {

        if (!maintainAspectRatio) {
            return { width: maxWidth, height: maxHeight };
        }

        // If image is smaller than max dimensions, keep original size
        if (original.width <= maxWidth && original.height <= maxHeight) {
            return original;
        }

        const aspectRatio = original.width / original.height;

        let newWidth = maxWidth;
        let newHeight = maxWidth / aspectRatio;

        // If height exceeds max, scale by height instead
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }

        return {
            width: Math.round(newWidth),
            height: Math.round(newHeight)
        };
    }
}