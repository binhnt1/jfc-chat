import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RoomDto } from '../../core/domains/room.dto';
import { UserType } from '../../core/domains/user.dto';
import { ChatService } from '../../services/openim.service';
import { RelativeTimePipe } from '../../core/pipes/relative.time';

@Component({
    standalone: true,
    selector: 'app-room-item',
    templateUrl: './room.item.component.html',
    styleUrls: ['./room.item.component.scss'],
    imports: [CommonModule, RelativeTimePipe],
})
export class RoomItemComponent {
    UserType = UserType;
    @Input() room: RoomDto;

    constructor(public chatService: ChatService) {
    }
}
