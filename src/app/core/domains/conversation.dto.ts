import { ConversationItem } from "@openim/client-sdk";

export type ConversationExtension = {
    typing?: boolean;
    typingUserID?: string | null;
}

export type ConversationDto = ConversationItem & ConversationExtension;