import express from "express";
import { dirname } from "path";
import { stringify } from "querystring";
import { fileURLToPath } from "url";
import io from "socket.io-client";

const root = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT;

const DEV_TOKEN = process.env.DEV_TOKEN;
const PLATFORM = "myrari.net";

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

async function initSocket(uuid: string): Promise<SocketInfo> {
    console.info("init socket for " + uuid);

    const authResp = await (await fetch("https://api.lovense-api.com/api/basicApi/getToken", {
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

    console.info("got auth token: " + authResp.data.authToken);

    const socketResp = await (await fetch("https://api.lovense-api.com/api/basicApi/getSocketUrl", {
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

app.post("/auth", async (req, res) => {
    const username = req.body.auth_username;
    const secret = req.body.auth_secret;

    console.info(`auth call: ${username}`);

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
    const userData = await mojangResp.json();

    if (mojangResp.status != 200) {
        const err = userData.errorMessage;
        console.error("Failed to get Minecraft user data: " + err);
        res.redirect("/?" + stringify({
            e: `${mojangResp.status}: ${err}`,
        }));
        return;
    }

    const uuid = userData.id;

    console.info("found minecraft uuid: " + uuid);

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
    if (qrData.data && qrData.data.ackId == ackId) {
        console.info(`got qrcode for ${username}`);
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

app.post("/hit", (req, res) => {
    const uuid = req.query.id?.toString();
    const secret = req.query.secret?.toString();

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

    console.info(`${uuid} hit for ${req.body.dmg}`);
    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.info(`The server is running at http://localhost:${PORT}`);
});
