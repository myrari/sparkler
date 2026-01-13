import express from "express";
import { dirname } from "path";
import { stringify } from "querystring";
import { fileURLToPath } from "url";
import io from "socket.io-client";

const root = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT;

const DEV_TOKEN = process.env.DEV_TOKEN;
const PLATFORM = process.env.PLATFORM;

interface SocketInfo {
    initialized: boolean;
    error?: string;
    socketUrl: string;
    socketPath: string;
};

function socketError(e: string): SocketInfo {
    return {
        initialized: false,
        error: e,
        socketUrl: "",
        socketPath: "",
    }
}

interface PlayerInfo {
    secret: string;
    socket: SocketInfo;
};

function newPlayer(secret: string): PlayerInfo {
    return {
        secret: secret,
        socket: {
            initialized: false,
            error: undefined,
            socketUrl: "",
            socketPath: "",
        }
    }
}

let players: Record<string, PlayerInfo> = {};

const app = express();

app.use(express.json());
app.use(express.urlencoded());

/** MAIN ROUTES */

app.get("/", (_req, res) => {
    res.sendFile("main.html", {
        root: root,
    })
});

app.get("/main.js", (_req, res) => {
    res.appendHeader("Content-Type", "application/javascript");

    res.sendFile("main.js", {
        root: root,
    });
});

app.get("/favicon.ico", (_req, res) => {
    res.appendHeader("Content-Type", "image/png");

    res.sendFile("sparkles-fluent-512.png", {
        root: root,
    });
});

// full authentication pipeline, verifies user & gets qr code
app.post("/auth", async (req, res) => {
    const username = req.body.auth_username;
    const secret = req.body.auth_secret;

    console.debug(`auth call: ${username}`);

    if (!secret) {
        console.warn("No secret provided! Ignoring...");
        res.redirect("/?" + stringify({
            e: "Please enter your client secret!",
        }));
        return;
    }
    if (!username) {
        console.warn("No username provided! Ignoring...");
        res.redirect("/?" + stringify({
            e: "Please enter your Minecraft username!",
        }));
        return;
    }

    const mojangResp = await fetch("https://api.mojang.com/users/profiles/minecraft/" + username, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    const userData: any = await mojangResp.json();

    if (mojangResp.status != 200) {
        const err = userData.errorMessage;
        console.error("Failed to get Minecraft user data: " + err);
        res.redirect("/?" + stringify({
            e: `${mojangResp.status}: ${err}`,
        }));
        return;
    }

    const uuid = userData.id;

    console.debug("found minecraft uuid: " + uuid);

    players[uuid] = newPlayer(secret);
    const socketInfo = await initSocket(uuid);
    if (socketInfo.error) {
        const err = `Error creating socket for ${username}: ${socketInfo.error}`;
        console.error(err);
        res.redirect("/?" + stringify({
            e: err,
        }));
        return;
    }
    players[uuid].socket = socketInfo;

    const socket = io(socketInfo.socketUrl, {
        path: socketInfo.socketPath,
        transports: ["websocket"],
    });

    const ackId = "qr_" + uuid + "_" + Date.now();
    socket.on("connect", () => {
        socket.emit("basicapi_get_qrcode_ts", {
            ackId: ackId,
        });
    });

    const getQRCode = () => new Promise(resolve => {
        socket.on("basicapi_get_qrcode_tc", (r: string) => {
            resolve(r);
        });
    });

    const qrResp = await getQRCode();
    let qrData = qrResp ? JSON.parse(qrResp as string) : {};

    socket.disconnect();

    if (qrData.data && qrData.data.ackId == ackId) {
        console.debug(`got qrcode for ${username}`);
        res.redirect("/?" + stringify({
            qr: qrData.data.qrcodeUrl,
        }));
    } else {
        const err = `Could not get qrcode for ${username}`;
        console.error(err);
        res.redirect("/?" + stringify({
            e: err,
        }));
    }
});

/** SPARKLER API ROUTES */

app.post("/hit", (req, res) => {
    const secret = req.query.secret?.toString();
    const uuid: string = req.body.id.trim().replace(/-/g, "");

    if (!secret) {
        console.warn("Received hit, but with no secret!");
        res.sendStatus(401);
        return;
    }
    if (!uuid) {
        console.warn("Received hit, but with no UUID!");
        res.sendStatus(401);
        return;
    }
    if (!players[uuid]) {
        console.warn(`Received hit for unauthenticated player ${uuid}!`);
        res.sendStatus(421);
        return;
    }
    if (secret != players[uuid].secret) {
        console.warn(`Received hit for ${uuid}, but with incorrect secret!`);
        res.sendStatus(403);
        return;
    }

    const dmg: number = req.body.dmg;
    const to: number = req.body.to;
    console.debug(`${uuid} hit for ${dmg} to ${to}`);

    sendHit(uuid, dmg, 2, (20 - to) / 4, easeInOutCubic);

    res.sendStatus(200);
});

/** HELPER FUNCTIONS */

// initialize a new socket with lovense
async function initSocket(uuid: string): Promise<SocketInfo> {
    console.debug("init socket for " + uuid);

    const authResp: any = await (await fetch("https://api.lovense-api.com/api/basicApi/getToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            token: DEV_TOKEN,
            uid: uuid,
        }),
    })).json();

    if (authResp.code != 0) {
        return socketError(`auth failed! ${authResp.code}: ${authResp.message}`);
    }

    console.debug("got auth token: " + authResp.data.authToken);

    const socketResp: any = await (await fetch("https://api.lovense-api.com/api/basicApi/getSocketUrl", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            platform: PLATFORM,
            authToken: authResp.data.authToken,
        }),
    })).json();

    if (socketResp.code != 0) {
        return socketError(`getting socket failed! ${socketResp.code}: ${socketResp.message}`);
    }

    return {
        initialized: true,
        error: undefined,
        socketUrl: socketResp.data.socketIoUrl,
        socketPath: socketResp.data.socketIoPath,
    };
}

function easeInOutCubic(x: number): number {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function sendHit(id: string, strength: number, res: number, length: number, f: (x: number) => number) {
    if (!players[id]) {
        console.error(`Cannot send hit for unauthenticated player ${id}`);
        return;
    }

    if (strength < 1 || length < 1 || res <= 0) {
        return;
    }

    const len = Math.floor(length * res);

    let cmds: string[] = new Array(len);
    for (let i = 0; i < len; i++) {
        const raw = strength * f(1 - (i / len));
        const clamped = Math.min(20, Math.ceil(raw));
        const str = clamped.toString().split(".")[0];
        cmds[i] = "Vibrate:" + str;
    }
    const cmd = cmds.join(",");

    const socket = io(players[id].socket.socketUrl, {
        path: players[id].socket.socketPath,
        transports: ["websocket"],
    });

    socket.emit("basicapi_send_toy_command_ts", {
        command: "Function",
        action: cmd,
        timeSec: length,
        loopRunningSec: 1 / res,
        loopPauseSec: 0.0,
        stopPrevious: 1,
        apiVer: 1,
    });
}

/** IMMEDIATE LOGIC */

// start the server
app.listen(PORT, () => {
    console.info(`The server is running at http://localhost:${PORT}`);
});
