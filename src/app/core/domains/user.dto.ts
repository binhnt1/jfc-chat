export class UserDto {
    ex?: string;
    userID: string;
    email?: string;
    phone?: string;
    type?: UserType;
    faceURL: string;
    gender?: number;
    nickname?: string;
    status?: UserStatus;
    createTime?: number;
    appMangerLevel?: number;
    globalRecvMsgOpt?: number;
}

export enum UserType {
    Sale = 'sale',
    Customer = 'customer'
}

export enum UserStatus {
    Offline = 0,
    Online,
}