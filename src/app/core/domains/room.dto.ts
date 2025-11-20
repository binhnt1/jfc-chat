import { UserType } from './user.dto';
import { ConversationDto } from './conversation.dto';
import { GroupItem, GroupMemberItem, MessageItem } from '@openim/client-sdk';

type RoomExtension = {
  ex?: string;
  emails?: string;
  symbol?: string;
  bgColor?: string;
  typing?: boolean;
  conversationID?: string;
  memberUserIDs?: string[];
  lastMessage?: MessageItem;
  members?: GroupMemberDto[];
  conversation: ConversationDto;
};

type GroupMemberExtension = {
  ex?: string;
  phone?: string;
  email?: string;
  type?: UserType;
}
export type RoomDto = GroupItem & RoomExtension;
export type GroupMemberDto = GroupMemberItem & GroupMemberExtension;