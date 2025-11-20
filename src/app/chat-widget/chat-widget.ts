import { filter, Observable, take } from 'rxjs';
import { MessageType } from '@openim/client-sdk';
import { ApiService } from '../services/api.service';
import { UtilityHelper } from '../core/utility.helper';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { ChatService } from '../services/openim.service';
import { UserDto, UserType } from '../core/domains/user.dto';
import { GroupMemberDto, RoomDto } from '../core/domains/room.dto';
import { LayoutState, PositionState } from '../core/domains/result.api';
import { LeftPanelComponent } from '../components/left-panel/left-panel';
import { RightPanelComponent } from '../components/right-panel/right-panel';
import { CenterPanelComponent } from '../components/center-panel/center-panel';
import { ImageViewerComponent } from "../components/image-viewer/image.viewer.component";
import { VideoViewerComponent } from "../components/video-viewer/video.viewer.component";

@Component({
    selector: 'app-chat-widget',
    standalone: true,
    imports: [
        CommonModule,
        LeftPanelComponent,
        CenterPanelComponent,
        RightPanelComponent,
        ImageViewerComponent,
        VideoViewerComponent
    ],
    providers: [DatePipe],
    templateUrl: './chat-widget.html',
    styleUrls: ['./chat-widget.scss']
})
export class ChatWidgetComponent implements OnInit {
    @Input() uid: string = '';
    @Input() top: string = '';
    @Input() email: string = '';
    @Input() phone: string = '';
    @Input() gender: number = 0;
    @Input() avatar: string = '';
    @Input() type: UserType = UserType.Customer;
    @Input() layout: LayoutState = LayoutState.Icon;
    @Input() position: PositionState = PositionState.Widget;

    members: UserDto[] = [];
    LayoutState = LayoutState;
    PositionState = PositionState;
    public selectedRoom$: Observable<RoomDto | null>;

    constructor(
        public service: ApiService,
        public chatService: ChatService) {

    }

    toggleChat(layout: LayoutState) {
        this.layout = layout;
        this.chatService.layoutState$.next(layout);
        if (layout == LayoutState.Maximize) {
            this.chatService.positionState$.next(PositionState.Widget);
        }
    }

    async ngOnInit(): Promise<void> {
        if (!this.uid) return;
        if (!this.type) this.type = UserType.Customer;
        if (!this.layout) this.layout = LayoutState.Icon;
        if (!this.position) this.position = PositionState.Widget;

        this.chatService.layoutState$.next(this.layout);
        this.chatService.positionState$.next(this.position);
        let token = await this.service.getUserToken(this.uid);
        if (!token) {
            await this.service.userRegister({
                type: this.type,
                userID: this.uid,
                phone: this.phone,
                email: this.email,
                gender: this.gender,
                faceURL: this.avatar,
            });
        } else {
            if (this.email || this.gender || this.phone) {
                await this.service.updateUserInfo({
                    type: this.type,
                    userID: this.uid,
                    phone: this.phone,
                    email: this.email,
                    gender: this.gender,
                    faceURL: this.avatar,
                });
            }
        }

        // Login
        if (token) {
            await this.chatService.init();
            await this.chatService.login(this.uid).then(async () => {
                let users = await this.service.getUsers(1000);
                switch (this.type) {
                    case UserType.Sale: {
                        let rooms = await this.service.getJoinedRooms(this.uid);

                        // get conversions
                        if (rooms && rooms.length > 0) {
                            this.chatService.listConversations = await this.chatService.conversations();
                            if (this.chatService.listConversations && this.chatService.listConversations.length > 0) {
                                rooms.forEach(async (room: RoomDto) => {
                                    let conversation = this.chatService.listConversations.find(c => c.groupID == room.groupID);
                                    if (conversation) {
                                        room.conversation = conversation;
                                        room.conversationID = conversation.conversationID;
                                        room.lastMessage = conversation.latestMsg ? JSON.parse(conversation.latestMsg) : null;
                                        if (room.lastMessage) {
                                            switch (room.lastMessage.contentType) {
                                                case MessageType.FileMessage:
                                                    room.lastMessage.textElem = { content: 'New File...' };
                                                    break;
                                                case MessageType.VideoMessage:
                                                    room.lastMessage.textElem = { content: 'New Video...' };
                                                    break;
                                                case MessageType.PictureMessage:
                                                    room.lastMessage.textElem = { content: 'New Picture...' };
                                                    break;
                                            }
                                        }
                                    }

                                    // group member
                                    let members = await this.chatService.getGroupMembers(room.groupID);
                                    if (members && members.length > 0) {
                                        room.members = members;
                                        members.forEach((user: GroupMemberDto) => {
                                            let userInfo = users.find(c => c.userID == user.userID);
                                            if (userInfo) {
                                                user.email = userInfo.email;
                                                user.phone = userInfo.phone;
                                                user.type = userInfo.type || UserType.Customer;
                                            }
                                        });
                                        room.emails = members.filter(c => c.email).map(c => c.email).join(', ');
                                    }
                                });
                            }
                        }
                        this.chatService.setRooms(rooms);
                    } break;
                    case UserType.Customer: {
                        let sales = users.filter(u => u.type == UserType.Sale);
                        if (sales && sales.length > 0) {
                            let userIds = sales.map(c => c.userID);
                            let sale = UtilityHelper.getRandomElement(sales);
                            let onlineUsers = await this.service.getOnlineUsers(userIds);
                            if (onlineUsers && onlineUsers.length > 0) {
                                let onlineSale = UtilityHelper.getRandomElement(onlineUsers);
                                if (onlineSale)
                                    sale = sales.find(c => c.userID == onlineSale.userID);
                            }

                            // create room
                            let rooms = await this.service.getJoinedRooms(this.uid);
                            if (!rooms || rooms.length == 0) {
                                await this.service.createRoom({
                                    ownerUserID: sale.userID,
                                    memberUserIDs: [this.uid],
                                    bgColor: UtilityHelper.getRandomDarkColor(),
                                    groupName: 'Room: ' + sale.nickname + ' - ' + this.uid,
                                });
                                rooms = await this.service.getJoinedRooms(this.uid);
                            }

                            // get conversions
                            let conversations = await this.chatService.conversations();
                            if (conversations && conversations.length > 0) {
                                rooms.forEach(async (room: RoomDto) => {
                                    let conversation = conversations.find(c => c.groupID == room.groupID);
                                    if (conversation) {
                                        room.conversation = conversation;
                                        room.conversationID = conversation.conversationID;
                                        room.lastMessage = conversation.latestMsg ? JSON.parse(conversation.latestMsg) : null;
                                    }

                                    // group member
                                    let members = await this.chatService.getGroupMembers(room.groupID);
                                    if (members && members.length > 0) {
                                        room.members = members;
                                        members.forEach((user: GroupMemberDto) => {
                                            let userInfo = users.find(c => c.userID == user.userID);
                                            if (userInfo) {
                                                user.email = userInfo.email;
                                                user.phone = userInfo.phone;
                                                user.type = userInfo.type || UserType.Customer;
                                            }
                                        });
                                        room.emails = members.map(c => c.email).join(', ');
                                    }
                                });
                            }
                            this.chatService.setRooms(rooms);
                        }
                    } break;
                }
                this.selectFirstAvailableRoom();
            });
        }
    }

    @Input() public openChat = (): void => {
        if (this.chatService.positionState$.value == PositionState.Widget) {
            if (this.chatService.layoutState$.value == LayoutState.Maximize)
                this.chatService.layoutState$.next(LayoutState.Close);
            this.chatService.positionState$.next(PositionState.Top);
        } else this.chatService.positionState$.next(PositionState.Widget);
    }

    private selectFirstAvailableRoom(): void {
        this.chatService.rooms$.pipe(
            filter(rooms => rooms && rooms.length > 0),
            take(1)
        ).subscribe(rooms => {
            const firstRoom = rooms[0];
            this.chatService.setSelectedRoom(firstRoom);
        });
        this.selectedRoom$ = this.chatService.selectedRoom$;
    }
}
