import { FormsModule } from '@angular/forms';
type RoomCategory = 'all' | 'open' | 'close';
import { CommonModule } from '@angular/common';
type SortKey = 'newest' | 'alphaAZ' | 'alphaZA';
import { map, Observable, Subscription } from 'rxjs';
import { UserType } from '../../core/domains/user.dto';
import { ApiService } from '../../services/api.service';
import { UtilityHelper } from '../../core/utility.helper';
import { ChatService } from '../../services/openim.service';
import { LayoutState, PositionState } from '../../core/domains/result.api';
import { RoomItemComponent } from '../rome-item/room.item.component';
import { GroupMemberDto, RoomDto } from '../../core/domains/room.dto';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-left-panel',
    templateUrl: './left-panel.html',
    styleUrls: ['./left-panel.scss'],
    imports: [CommonModule, FormsModule, RoomItemComponent],
})
export class LeftPanelComponent implements OnInit, OnDestroy {
    searchTerm = '';
    sortBy = 'newest';
    UserType = UserType;
    openedExpanded = true;
    closedExpanded = true;
    PositionState = PositionState;
    rooms$: Observable<RoomDto[] | null>;
    currentCategory: RoomCategory = 'all';
    selectedRoom$: Observable<RoomDto | null>;

    private groupSubscription!: Subscription;
    private typingSubscription!: Subscription;
    private inputStatusSubscription!: Subscription;

    public isSortDropdownOpen = false;
    public currentSort: SortKey = 'newest';
    public sortOptions: { [key in SortKey]: { label: string } } = {
        'newest': { label: 'Newest' },
        'alphaAZ': { label: 'Alphabet A-Z' },
        'alphaZA': { label: 'Alphabet Z-A' }
    };

    constructor(
        public service: ApiService,
        public chatService: ChatService) {
        this.rooms$ = this.chatService.rooms$;
        this.selectedRoom$ = this.chatService.selectedRoom$;
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        if (!target.closest('.sort-dropdown')) {
            this.isSortDropdownOpen = false;
        }
    }

    ngOnInit() {
        this.groupSubscription = this.chatService.newGroupHandler$.subscribe((room: RoomDto) => {
            setTimeout(async () => {
                if (!room) return;
                this.chatService.listConversations = await this.chatService.conversations();
                room.symbol = room.ex ? JSON.parse(room.ex).symbol : room.groupName.substring(0, 2);
                room.bgColor = room.ex ? JSON.parse(room.ex).bgColor : UtilityHelper.getRandomDarkColor();
                if (this.chatService.listConversations && this.chatService.listConversations.length > 0) {
                    let conversation = this.chatService.listConversations.find(c => c.groupID == room.groupID);
                    if (conversation) {
                        room.conversation = conversation;
                        room.conversationID = conversation.conversationID;
                        room.lastMessage = conversation.latestMsg ? JSON.parse(conversation.latestMsg) : null;
                    }

                    // group member
                    let members = await this.chatService.getGroupMembers(room.groupID);
                    if (members && members.length > 0) {
                        // get users
                        let memberIds = members.map(c => c.userID);
                        let users = await this.service.getUserInfos(memberIds);

                        // set user
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
                }
                this.chatService.addRoom(room);
            }, 1000);
        });
        this.typingSubscription = this.chatService.typingHandler$.subscribe((conversationID: string) => {
            this.chatService.setRoomTypingStatus(conversationID);
        });
        // Listen for typing status from other users
        this.inputStatusSubscription = this.chatService.inputStatusHandler$.subscribe((data) => {
            if (data) {
                let typingUserID = data.userID;
                let conversationId = data.conversationID;
                let isTyping = data.platformIDs && data.platformIDs.length > 0;
                this.chatService.updateRoomTypingStatus(conversationId, isTyping, typingUserID);
            }
        });
    }

    ngOnDestroy(): void {
        if (this.groupSubscription) {
            this.groupSubscription.unsubscribe();
            this.groupSubscription = null;
        }
        if (this.typingSubscription) {
            this.typingSubscription.unsubscribe();
            this.typingSubscription = null;
        }
        if (this.inputStatusSubscription) {
            this.inputStatusSubscription.unsubscribe();
            this.inputStatusSubscription = null;
        }
    }

    get openRooms$(): Observable<RoomDto[]> {
        return this.rooms$.pipe(
            map(rooms => this.filterAndSort(rooms, 'open'))
        );
    }
    get closedRooms$(): Observable<RoomDto[]> {
        return this.rooms$.pipe(
            map(rooms => this.filterAndSort(rooms, 'close'))
        );
    }
    get displayRooms$(): Observable<RoomDto[]> {
        return this.rooms$.pipe(
            map(rooms => this.filterAndSort(rooms, 'all'))
        );
    }

    parseTime(timeStr: string): number {
        if (timeStr.includes(':')) {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        } else if (timeStr.includes('d')) {
            return parseInt(timeStr) * 24 * 60;
        } else if (timeStr.includes('w')) {
            return parseInt(timeStr) * 7 * 24 * 60;
        }
        return 0;
    }

    toggleOpenedSection(): void {
        this.openedExpanded = !this.openedExpanded;
    }

    toggleClosedSection(): void {
        this.closedExpanded = !this.closedExpanded;
    }

    async selectRoom(room: RoomDto): Promise<void> {
        this.chatService.setSelectedRoom(room);
        if (room.conversation && room.conversation.unreadCount > 0) {
            await this.chatService.markConversationMessageAsRead(room.conversationID);
            const updatedConversation = {
                ...room.conversation,
                unreadCount: 0
            };
            this.chatService.updateRoomById(room.groupID, { conversation: updatedConversation });
        }
    }

    async selectRoomTop(room: RoomDto): Promise<void> {
        this.selectRoom(room);
        this.chatService.layoutState$.next(LayoutState.Minimize);
    }

    private sortRooms(rooms: RoomDto[]): RoomDto[] {
        const sortedRooms = [...rooms]; // Tạo một bản sao để tránh thay đổi mảng gốc

        switch (this.currentSort) {
            case 'newest':
                sortedRooms.sort((a, b) => b.createTime - a.createTime);
                break;
            case 'alphaAZ':
                sortedRooms.sort((a, b) => a.groupName.localeCompare(b.groupName));
                break;
            case 'alphaZA':
                sortedRooms.sort((a, b) => b.groupName.localeCompare(a.groupName));
                break;
        }
        return sortedRooms;
    }

    toggleSortDropdown(): void {
        this.isSortDropdownOpen = !this.isSortDropdownOpen;
    }

    setSort(key: string): void {
        this.currentSort = <SortKey>key;
        this.isSortDropdownOpen = false;
    }
    setCategory(category: RoomCategory): void {
        this.currentCategory = category;
    }
    private filterAndSort(rooms: RoomDto[], category: RoomCategory): RoomDto[] {
        if (category == 'open' || category == 'close') {
            // 1. Lọc theo trạng thái Open/Close
            const filteredByCategory = category === 'open'
                ? rooms.filter(room => room.introduction === 'open')
                : rooms.filter(room => room.introduction === 'close');

            // 2. Lọc theo từ khóa tìm kiếm
            let filteredBySearch = filteredByCategory;
            if (this.searchTerm) {
                filteredBySearch = filteredByCategory.filter(room =>
                    room.groupName.toLowerCase().includes(this.searchTerm.toLowerCase())
                );
            }

            // 3. Sắp xếp kết quả
            return this.sortRooms(filteredBySearch);
        } else {
            // 1. Lọc theo trạng thái All
            const filteredByCategory = rooms;

            // 2. Lọc theo từ khóa tìm kiếm
            let filteredBySearch = filteredByCategory;
            if (this.searchTerm) {
                filteredBySearch = filteredByCategory.filter(room =>
                    room.groupName.toLowerCase().includes(this.searchTerm.toLowerCase())
                );
            }

            // 3. Sắp xếp kết quả
            return this.sortRooms(filteredBySearch);
        }
    }
}
