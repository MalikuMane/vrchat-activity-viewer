import { ActivityLog, MoveActivityLog, EnterActivityLog, SendNotificationActivityLog, WorldAccessScope, AuthenticationActivityLog, ActivityType, NotificationType, SendActivityType, CheckBuildActivityLog, ShutdownActivityLog, ReceiveActivityType, ReceiveNotificationActivityLog } from "../type";

export function parseVRChatLog(logString: string, logPath: string): ActivityLog[] {
    const lineSymbol = "\n";
    const rawActivities = logString.split(lineSymbol).filter((line) => {
        return line.length > 1; // 空行フィルタ
    })

    const activityLog: ActivityLog[] = [];
    rawActivities.forEach((rawActivity, index) => {
        try {
            const activity = parseRawActivityToActivity(rawActivity, index, rawActivities);
            if (activity) activityLog.push(activity);
        } catch (error) {
            console.log("catch error, log file: " + logPath);
            console.log("catch error, log: " + rawActivity);
            console.log("catch error, log next: " + rawActivities[index+1]);
            console.log(error);
        }
    });
    return activityLog;
}

// 次行のインスタンスIDを取るため全部引数に渡す
function parseRawActivityToActivity(rawActivity: string, index: number, rawActivities: string[]): ActivityLog | null {
    const reg = /^(\d{4}\.\d{2}\.\d{2})\s(\d{2}:\d{2}:\d{2}) Log\s{8}-\s{2}(.+)/.exec(rawActivity)!;
    if (!reg || reg.length < 4) return null;
    const mmmmyydd = reg[1];
    const hhmmss = reg[2];
    const utcTime = new Date(mmmmyydd + " " + hhmmss).getTime();
    const message = reg[3];

    let activityLog: ActivityLog = null!;

    // join
    if (message.indexOf("[NetworkManager] OnPlayerJoined") != -1) {
        const activity: MoveActivityLog = {
            date: utcTime,
            activityType: ActivityType.Join,
            userData: {
                userName: /^\[NetworkManager\] OnPlayerJoined\s(.+)/.exec(message)![1]
            }
        };
        activityLog = activity;
    // leave
    } else if (message.indexOf("[NetworkManager] OnPlayerLeft") != -1 && message.indexOf("OnPlayerLeftRoom") === -1) {
        const activity: MoveActivityLog = {
            date: utcTime,
            activityType: ActivityType.Leave,
            userData: {
                userName: /^\[NetworkManager\] OnPlayerLeft\s(.+)/.exec(message)![1]
            }
        };
        activityLog = activity;
    // enter
    } else if (message.indexOf("Entering Room") != -1) {
        const worldInfo = parseEnterActivityJoinLine(rawActivities[index+1])!;
        const activity: EnterActivityLog = {
            date: utcTime,
            activityType: ActivityType.Enter,
            worldData: {
                worldName: /^\[RoomManager\] Entering\sRoom:\s(.+)/.exec(message)![1],
                worldId: worldInfo.worldId,
                instanceId: worldInfo.instanceId,
                access: worldInfo.access,
                instanceOwner: worldInfo.instanceOwner,
                nonce: worldInfo.nonce
            }
        };
        activityLog = activity;
    // send: friendRequest, invite, requestInvite
    } else if (message.indexOf("Send notification") != -1) {
        const info = parseSendNotificationMessage(message)!;
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
                details: info.details,
                type: info.type,
                senderType: info.senderType
            }
        };
        activityLog = activity;
    // receive: friendRequest, invite, requestInvite
    } else if (message.indexOf("Received Notification") != -1) {
        const info = parseReceiveNotificationMessage(message)!;

        if (!info.to.id) return null; // pending friend request
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
                details: info.details,
                type: info.type,
                senderType: info.senderType
            }
        };
        activityLog = activity;
    // login
    } else if (message.indexOf("[VRCFlowManagerVRC] User Authenticated") != -1) {
        const activity: AuthenticationActivityLog = {
            date: utcTime,
            activityType: ActivityType.Authentication,
            userName: /^\[VRCFlowManagerVRC\] User Authenticated:\s(.+)/.exec(message)![1]
        };
        activityLog = activity;
    // check build
    } else if (message.indexOf("VRChat Build") != -1) {
        const activity: CheckBuildActivityLog = {
            date: utcTime,
            activityType: ActivityType.CheckBuild,
            buildName: /^\[VRCApplicationSetup\] VRChat Build: ([\w\-\.\s]+), \w+/.exec(message)![1]
        };
        activityLog = activity;
    // shutdown
    } else if (message.indexOf("shutdown") != -1) {
        const activity: ShutdownActivityLog = {
            date: utcTime,
            activityType: ActivityType.Shutdown
        }
        activityLog = activity;
    }

    if (activityLog) return activityLog;
    // console.log("unsupported log: " + message);
    return null;
}

function parseEnterActivityJoinLine(joinLine: string): WorldEnterInfo | null {
    const reg = /^(\d{4}\.\d{2}\.\d{2})\s(\d{2}:\d{2}:\d{2})\s.+\[.+\]\s(.+)/.exec(joinLine);
    if (!reg) return null;
    const message = reg[3];

    let worldEnterInfo: WorldEnterInfo | null;
    if (joinLine.indexOf("nonce") !== -1) {
        worldEnterInfo = parseScopeEnterMessage(message);
    } else {
        worldEnterInfo = parsePublicEnterMessage(message);
    }
    return worldEnterInfo;
}

function parsePublicEnterMessage(message: string): WorldEnterInfo | null {
    const reg = /^Joining\s(wrld_[\w\-]+):(\d+)/.exec(message);

    if (!reg) return null;
    return {
        worldId: reg[1],
        instanceId: reg[2],
        access: "public"
    };
}

function parseScopeEnterMessage(message: string): WorldEnterInfo | null {
    const reg = /^Joining\s(wrld_[\w\-]+):(\w+)~(\w+)\((usr_[\w\-]+)\)(~canRequestInvite)?~nonce\((\w+)\)/.exec(message);
    // NOTE: instanceIdの:(\w+)は通常数字で\dマッチだが、英字で作ることも可能なので\wマッチ

    if (!reg) return null;
    let access = getWorldScope(reg[3], reg[5]);
    return {
        worldId: reg[1],
        instanceId: reg[2],
        access: access,
        instanceOwner: reg[4],
        canRequestInvite: reg[5],
        nonce: reg[6]
    };
}

function getWorldScope(access: string, canRequestInvite: string): WorldAccessScope {
    let result: WorldAccessScope;
    if (access === "hidden") {
        result = "friends+";
    } else if (access === "friends") {
        result = "friends";
    } else if (access === "private" && !!canRequestInvite) {
        result = "invite+";
    } else if (access === "private") {
        result = "invite";
    } else {
        result = "unknown";
    }
    return result;
}

function parseSendNotificationMessage(message: string): NotificationInfo | null {
    const reg = /^Send notification:<Notification from username:(.+), sender user id:(usr_[\w\-]+) to (usr_[\w\-]+) of type: ([\w]+), id: (\w*), created at: (\d{2}\/\d{2}\/\d{4})\s(\d{2}:\d{2}:\d{2}) UTC, details: ({{.*?}}), type:(\w+)/.exec(message);

    if (!reg) return null;
    return {
        from: {
            userName: reg[1],
            id: reg[2],
        },
        to: {
            id: reg[3],
        },
        senderType: reg[4] as NotificationType,
        created: {
            date: reg[6],
            time: reg[7]
        },
        details: reg[8],
        type: reg[9] as NotificationType
    };
}

function parseReceiveNotificationMessage(message: string): NotificationInfo | null {
    const reg = /^Received Notification: <Notification from username:(.+), sender user id:(usr_[\w\-]+) to (usr_[\w\-]+)? of type: ([\w]+), id: ([\w\-]+), created at: (\d{2}\/\d{2}\/\d{4})\s(\d{2}:\d{2}:\d{2}) UTC, details: ({{.*?}}), type:(\w+)/.exec(message);
    if (!reg) return null;
    return {
        from: {
            userName: reg[1],
            id: reg[2],
        },
        to: {
            id: reg[3],
        },
        senderType: reg[4] as NotificationType,
        created: {
            date: reg[6],
            time: reg[7]
        },
        details: reg[8],
        type: reg[9] as NotificationType
    };
}

interface WorldEnterInfo {
    worldId: string;
    instanceId: string;
    access: WorldAccessScope;
    instanceOwner?: string;
    canRequestInvite?: string;
    nonce?: string;
}

interface NotificationInfo {
    from: {
        userName: string;
        id: string;
    };
    to: {
        id: string;
    };
    senderType: NotificationType;
    created: {
        date: string;
        time: string;
    };
    details: string;
    type: NotificationType;
}
