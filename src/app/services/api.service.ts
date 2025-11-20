import { Injectable } from "@angular/core";
import { ApiUrl } from "../core/api.url.helper";
import { HttpClient } from '@angular/common/http';
import { RoomDto } from "../core/domains/room.dto";
import { UtilityHelper } from "../core/utility.helper";
import { ResultApi } from "../core/domains/result.api";
import { OpenIMConfig } from "../config/openim.config";
import { UserDto, UserType } from "../core/domains/user.dto";

@Injectable({
    providedIn: 'root',
})
export class ApiService {

    constructor(protected http: HttpClient) {
    }

    async getAdminToken() {
        const TOKEN_KEY = 'openim_admin_token';
        const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;
        const EXPIRATION_KEY = 'openim_admin_token_expiration';

        // 1. Lấy token và thời gian hết hạn từ localStorage
        const now = new Date().getTime();
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedExpiration = localStorage.getItem(EXPIRATION_KEY);


        // 2. Kiểm tra xem token có hợp lệ không
        if (storedToken && storedExpiration) {
            const expirationTime = parseInt(storedExpiration, 10);
            if (expirationTime > now + EXPIRATION_BUFFER_MS) {
                return storedToken;
            }
        }

        // 3. Nếu không có token hoặc token đã hết hạn, gọi API để lấy token mới
        let api = ApiUrl.ToUrl('/auth/get_admin_token'),
            obj = {
                secret: OpenIMConfig.secret,
                userID: OpenIMConfig.adminId
            };
        return this.callApi(api, obj, false).then((result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                const { token, expireTimeSeconds } = result.Object;

                // 4. Tính toán thời gian hết hạn tuyệt đối và lưu vào localStorage
                const newExpirationTime = now + (expireTimeSeconds * 1000);
                localStorage.setItem(EXPIRATION_KEY, newExpirationTime.toString());
                localStorage.setItem(TOKEN_KEY, token);
                return token;
            }
            return null;
        });
    }

    async userRegister(user: UserDto) {
        let api = ApiUrl.ToUrl('/user/user_register'),
            obj = {
                secret: OpenIMConfig.secret,
                users: [{
                    userId: user.userID,
                    gender: user.gender,
                    faceURL: user.faceURL,
                    nickname: user.userID,
                    ex: JSON.stringify({ type: user.type, email: user.email, phone: user.phone })
                }],
            };
        return await this.callApi(api, obj);
    }

    async updateUserInfo(user: UserDto) {
        let api = ApiUrl.ToUrl('/user/update_user_info_ex'),
            obj = {
                userInfo: {
                    userID: user.userID,
                    gender: user.gender,
                    faceURL: user.faceURL,
                    nickname: user.userID,
                    ex: JSON.stringify({ type: user.type, email: user.email, phone: user.phone })
                },
            };
        return await this.callApi(api, obj);
    }

    async getUserToken(userId: string) {
        const EXPIRATION_BUFFER_MS = 5 * 60 * 1000;
        const TOKEN_KEY = 'openim_' + userId + '_token';
        const EXPIRATION_KEY = 'openim_' + userId + '_token_expiration';

        // 1. Lấy token và thời gian hết hạn từ localStorage
        const now = new Date().getTime();
        // const storedToken = localStorage.getItem(TOKEN_KEY);
        // const storedExpiration = localStorage.getItem(EXPIRATION_KEY);

        // // 2. Kiểm tra xem token có hợp lệ không
        // if (storedToken && storedExpiration) {
        //     const expirationTime = parseInt(storedExpiration, 10);
        //     if (expirationTime > now + EXPIRATION_BUFFER_MS) {
        //         return storedToken;
        //     }
        // }

        // 3. Nếu không có token hoặc token đã hết hạn, gọi API để lấy token mới
        let api = ApiUrl.ToUrl('/auth/get_user_token'),
            obj = {
                userID: userId,
                platformID: OpenIMConfig.platformId
            };
        return this.callApi(api, obj).then(async (result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                const { token, expireTimeSeconds } = result.Object;

                // 4. Tính toán thời gian hết hạn tuyệt đối và lưu vào localStorage
                const newExpirationTime = now + (expireTimeSeconds * 1000);
                localStorage.setItem(EXPIRATION_KEY, newExpirationTime.toString());
                localStorage.setItem(TOKEN_KEY, token);
                return token;
            }
            return null;
        });
    }

    async getJoinedRooms(userId: string) {
        let api = ApiUrl.ToUrl('/group/get_joined_group_list'),
            obj = {
                fromUserID: userId,
                pagination: {
                    pageNumber: 1,
                    showNumber: 100
                }
            };
        let items = await this.callApi(api, obj).then((result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                let groups: RoomDto[] = result.Object.groups;
                if (groups && groups.length > 0) {
                    groups.forEach((room: RoomDto) => {
                        if (!room.introduction)
                            room.introduction = 'open';
                        room.symbol = room.ex && room.ex.indexOf("{") >= 0 ? JSON.parse(room.ex).symbol : room.groupName.substring(0, 2);
                        room.bgColor = room.ex && room.ex.indexOf("{") >= 0 ? JSON.parse(room.ex).bgColor : UtilityHelper.getRandomDarkColor();
                    });
                }
                return groups;
            }
            return null;
        });
        return items;
    }

    async getUserInfos(userIds: string[]) {
        let api = ApiUrl.ToUrl('/user/get_users_info'),
            obj = { userIDs: userIds };
       let items = await this.callApi(api, obj).then((result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                let users: UserDto[] = result.Object.usersInfo;
                if (users && users.length > 0) {
                    users.forEach((user: UserDto) => {
                        user.email = user.ex ? JSON.parse(user.ex).email : '';
                        user.phone = user.ex ? JSON.parse(user.ex).phone : '';
                        user.type = user.ex ? JSON.parse(user.ex).type : UserType.Customer;
                    });
                }
                return users;
            }
            return null;
        });
        return items;
    }

    async createRoom(room: Partial<RoomDto>) {
        let firstSymbol = room.ownerUserID.substring(0, 1),
            secondSymbol = room.memberUserIDs[0].substring(0, 1);
        let api = ApiUrl.ToUrl('/group/create_group'),
            obj = {
                ownerUserID: room.ownerUserID,
                memberUserIDs: room.memberUserIDs,
                adminUserIDs: [OpenIMConfig.adminId],
                groupInfo: {
                    groupType: 2,
                    lookMemberInfo: 1,
                    needVerification: 0,
                    applyMemberFriend: 1,
                    introduction: 'open',
                    groupName: room.groupName,
                    ex: JSON.stringify({
                        bgColor: room.bgColor,
                        symbol: firstSymbol + secondSymbol
                    }),
                    groupID: 'RO_' + UtilityHelper.createUniqueId(),
                }
            };
        return await this.callApi(api, obj);
    }

    async getUsers(count: number = 1000): Promise<UserDto[]> {
        let api = ApiUrl.ToUrl('/user/get_users'),
            obj = {
                pagination: {
                    pageNumber: 1,
                    showNumber: count
                }
            };
        let items = await this.callApi(api, obj).then((result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                let users: UserDto[] = result.Object.users;
                if (users && users.length > 0) {
                    users.forEach((user: UserDto) => {
                        user.email = user.ex ? JSON.parse(user.ex).email : '';
                        user.phone = user.ex ? JSON.parse(user.ex).phone : '';
                        user.type = user.ex ? JSON.parse(user.ex).type : UserType.Customer;
                    });
                }
                return users;
            }
            return null;
        });
        return items;
    }

    async getOnlineUsers(userIds: string[]): Promise<UserDto[]> {
        let api = ApiUrl.ToUrl('/user/get_users_online_status'),
            obj = {
                userIDs: userIds
            };
        let items = await this.callApi(api, obj).then((result: ResultApi) => {
            if (ResultApi.IsSuccess(result)) {
                let users: UserDto[] = result.Object.users;
                return users;
            }
            return null;
        });
        return items;
    }

    protected async callApi(api: string, params?: any, needToken: boolean = true) {
        if (!params) params = {};
        let headers: any = {
            operationID: UtilityHelper.createUniqueId(),
        };
        if (needToken) headers.token = await this.getAdminToken();
        return await this.http
            .post(api, params, { headers: headers })
            .toPromise()
            .then((c: any) => {
                return ResultApi.ToEntity(c);
            })
            .catch(async e => {
                return ResultApi.ToException(e);
            });
    }
}