import { PushDto } from "./push.dto";
import { MessageItem } from "@openim/client-sdk";

export class MessageTextDto {
    text: string;
    recvID?: string;
    groupID?: string;
    requestId?: string;
    offlinePushInfo?: PushDto;
}

export class MessageReplyDto {
    text: string;
    recvID?: string;
    groupID?: string;
    requestId?: string;
    replyItem?: MessageDto;
    offlinePushInfo?: PushDto;
}

export class MessageFileDto {
    file: File;
    recvID?: string;
    groupID?: string;
    requestId?: string;
    offlinePushInfo?: PushDto;
}

export class MessageImageDto {
    file: File;
    recvID: string;
    groupID: string;
    requestId?: string;
    offlinePushInfo?: PushDto;
}

export class MessageVideoDto {
    file: File;
    thumbnail: File;
    recvID?: string;
    groupID?: string;
    duration: number;
    requestId?: string;
    offlinePushInfo?: PushDto;
}

export class MessageLocationDto {
    recvID?: string;
    groupID?: string;
    latitude: number;
    longitude: number;
    requestId?: string;
    description: string;
    offlinePushInfo?: PushDto;
}

export class GroupMessage {
    sendID?: string;
    isRead?: boolean;
    sendTime?: number;
    items: MessageDto[];
}

export class RevokeMessageDto {
    clientMsgID: string;
    conversationID: string;
}

export enum GroupMessageType {
    Single = 1,
    Group = 2,
}

type FileExtension = {
    fileName: string;
}
export type MessageDto = MessageItem & FileExtension