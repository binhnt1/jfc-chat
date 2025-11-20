import { ConversationItem } from "@openim/client-sdk";

export type ConversationExtension = {
    typing?: boolean;
}

export type ConversationDto = ConversationItem & ConversationExtension;