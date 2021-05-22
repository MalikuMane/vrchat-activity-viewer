import { MoveActivityLog, ReceiveActivityType, ReceiveNotificationActivityLog } from "..";
import { ActivityType } from "../type/ActivityLogType/common";
import { SendActivityType, SendNotificationActivityLog } from "../type/ActivityLogType/sendType";
import { EnterActivityLog, AuthenticationActivityLog, CheckBuildActivityLog, ShutdownActivityLog } from "../type/ActivityLogType/system";
import { ReceiveNotificationInfo, SendNotificationInfo, WorldEnterInfo } from "../type/LogType/ParsedInfo";
import { detailParse, parseSquareBrackets } from "./reg";

export function createJoinActivityLog(utcTime: number, message: string): MoveActivityLog {
    const reg = parseSquareBrackets(message)!; // [NetworkManager]
    const activity: MoveActivityLog = {
        date: utcTime,
        activityType: ActivityType.Join,
        userData: {
            userName: /^OnPlayerJoined\s(.+)/.exec(reg[3])![1]
        }
    };
    return activity;
}

export function createLeaveActivityLog(utcTime: number, message: string): MoveActivityLog {
    const reg = parseSquareBrackets(message)!; // [NetworkManager]
    const activity: MoveActivityLog = {
        date: utcTime,
        activityType: ActivityType.Leave,
        userData: {
            userName: /^OnPlayerLeft\s(.+)/.exec(reg[3])![1]
        }
    };
    return activity;
}

export function createEnterActivityLog(utcTime: number, message: string, worldInfo: WorldEnterInfo) {
    const reg = parseSquareBrackets(message)!; // [RoomManager]
    const activity: EnterActivityLog = {
        date: utcTime,
        activityType: ActivityType.Enter,
        worldData: {
            worldName: /^Entering\sRoom:\s(.+)/.exec(reg[3])![1],
            worldId: worldInfo.worldId,
            instanceId: worldInfo.instanceId,
            access: worldInfo.access,
            instanceOwner: worldInfo.instanceOwner,
            nonce: worldInfo.nonce
        }
    };
    return activity;
}

export function createSendNotificationActivityLog(utcTime: number, message: string, info: SendNotificationInfo) {
    let sendActivityType: SendActivityType;
    switch (info.type) {
        case "invite":
            sendActivityType = SendActivityType.Invite;
            break;
        case "requestInvite":
            sendActivityType = SendActivityType.RequestInvite;
            break;
        case "friendRequest":
            sendActivityType = SendActivityType.FriendRequest;
            break;
        case "inviteResponse":
            sendActivityType = SendActivityType.InviteResponse;
            break;
        default:
            sendActivityType = SendActivityType.Unknown;
    }
    const activity: SendNotificationActivityLog = {
        date: utcTime,
        activityType: ActivityType.Send,
        sendActivityType: sendActivityType,
        data: {
            from: {
                userName: info.from.userName,
                id: info.from.id
            },
            to: {
                id: info.to.id
            },
            created: {
                date: info.created.date,
                time: info.created.time
            },
            detailsRaw: info.detailsRaw,
            type: info.type,
            senderType: info.senderType,
            message: info.message,
            imageLen: info.imageLen
        }
    };
    return activity;
}

export function createReceiveNotificationActivityLog(utcTime: number, message: string, info: ReceiveNotificationInfo) {
    let receiveActivityType: ReceiveActivityType;
    switch (info.type) {
        case "invite":
            receiveActivityType = ReceiveActivityType.Invite;
            break;
        case "requestInvite":
            receiveActivityType = ReceiveActivityType.RequestInvite;
            break;
        case "friendRequest":
            receiveActivityType = ReceiveActivityType.FriendRequest;
            break;
        case "inviteResponse":
            receiveActivityType = ReceiveActivityType.InviteResponse;
            break;
        case "requestInviteResponse":
            receiveActivityType = ReceiveActivityType.RequestInviteResponse;
            break;
        default:
            receiveActivityType = ReceiveActivityType.Unknown;
    }

    const activity: ReceiveNotificationActivityLog = {
        date: utcTime,
        activityType: ActivityType.Receive,
        receiveActivityType: receiveActivityType,
        data: {
            from: {
                userName: info.from.userName,
                id: info.from.id
            },
            to: {
                id: info.to.id
            },
            created: {
                date: info.created.date,
                time: info.created.time
            },
            details: {},
            detailsRaw: info.detailsRaw,
            type: info.type,
            senderType: info.senderType
        }
    };

    const details = detailParse(info.detailsRaw);
    if (details.responseMessage) {
        activity.data.details.responseMessage = details.responseMessage;
    }
    if (details.requestMessage) {
        activity.data.details.requestMessage = details.requestMessage;
    }
    if (details.imageUrl) {
        activity.data.details.imageUrl = details.imageUrl;
    }
    return activity;
}

export function createAuthenticationActivityLog(utcTime: number, message: string) {
    const reg = parseSquareBrackets(message)!; // [VRCFlowManagerVRC]
    const activity: AuthenticationActivityLog = {
        date: utcTime,
        activityType: ActivityType.Authentication,
        userName: /^User Authenticated:\s(.+)/.exec(reg[3])![1]
    };
    return activity;
}

export function createCheckBuildActivityLog(utcTime: number, message: string) {
    const reg = parseSquareBrackets(message)!; // [VRCApplicationSetup]
    const activity: CheckBuildActivityLog = {
        date: utcTime,
        activityType: ActivityType.CheckBuild,
        buildName: /^VRChat Build: ([\w\-.\s]+), \w+/.exec(reg[3])![1]
    };
    return activity;
}

export function createShutdownActivityLog(utcTime: number, message: string) {
    const activity: ShutdownActivityLog = {
        date: utcTime,
        activityType: ActivityType.Shutdown
    }
    return activity;
}
