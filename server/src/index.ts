import express from "express";
import { dirname } from 'path';
// import { stringify } from "querystring";
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const DEV_TOKEN = process.env.DEV_TOKEN;
// minecraft user uuid
const UID = process.env.UID;
const PLATFORM = "myrari.net";

let socketInfo = {
    initialized: false,
    socketUrl: undefined,
    socketPath: undefined,
};

const app = express();

app.use(express.json());

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

async function authSocket() {
    const authResp = await (await fetch("https://api.lovense-api.com/api/basicApi/getToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            token: DEV_TOKEN,
            uid: UID,
        }),
    })).json();

    if (authResp.code != 0) {
        console.error(`auth failed! ${authResp.code}: ${authResp.message}`);
        return;
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
        console.error(`getting socket failed! ${socketResp.code}: ${socketResp.message}`);
        return;
    }

    console.info("got socket url: " + socketResp.data.socketIoUrl);
    socketInfo = {
        initialized: true,
        socketUrl: socketResp.data.socketIoUrl,
        socketPath: socketResp.data.socketIoPath,
    };
}

app.get("/auth", async (_req, res) => {
    // console.info("call to auth");
    await authSocket();
    if (!socketInfo.initialized || !socketInfo.socketUrl || !socketInfo.socketPath) {
        console.error("failed to intialize socket info!");
        res.json({
            code: 100,
        });
        return;
    }

    const socket = new WebSocket(`${socketInfo.socketUrl}${socketInfo.socketPath}`);
    // const socket = new WebSocket("ws://localhost:4200");
	console.info(`socket: ${socket.url}`);
    // socket.onopen = _ => {
    // 	socket.send("basicapi_get_qrcode_ts");
    // };
    socket.addEventListener("open", _ => {
		console.info("socket open");
        socket.send("hiiiiii");
    })
	socket.addEventListener("message", evt => {
		console.info(`qrcode response data: ${evt.data}`);
	});
});

app.post("/hit", (req, res) => {
    const secret = req.query.secret;
    if (secret == undefined) {
        console.warn("Received hit, but with no secret!");
        res.sendStatus(401);
    } else if (secret != CLIENT_SECRET) {
        console.warn("Received hit, but with incorrect secret!");
        res.sendStatus(403);
    } else {
        console.info("Received valid hit for " + req.body.dmg);
        res.sendStatus(200);
    }
});

app.listen(PORT, () => {
    console.info(`The server is running at http://localhost:${PORT}`);
});
