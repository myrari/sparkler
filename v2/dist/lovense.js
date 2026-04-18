import io from "socket.io-client";
import { sessions } from "./api.js";
const LOVENSE_TOKEN = process.env.LOVENSE_TOKEN;
const LOVENSE_PLATFORM = process.env.LOVENSE_PLATFORM;
;
function socketError(e) {
    return {
        initialized: false,
        error: e,
        socketUrl: "",
        socketPath: "",
    };
}
// initialize a new socket with lovense
async function initSocket(id) {
    const authResp = await (await fetch("https://api.lovense-api.com/api/basicApi/getToken", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            token: LOVENSE_TOKEN,
            uid: id,
        }),
    })).json();
    if (authResp.code != 0) {
        return socketError(`auth failed! ${authResp.code}: ${authResp.message}`);
    }
    const socketResp = await (await fetch("https://api.lovense-api.com/api/basicApi/getSocketUrl", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            platform: LOVENSE_PLATFORM,
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
// intensity easing function
function easeInOutCubic(x) {
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}
function newLovenseSink(socket) {
    return {
        socket: socket,
        send(intensity, duration) {
            console.debug(`Lovense sink sending hit, intensity ${intensity} and duration ${duration}`);
            // temporal resolution scale for vibrate commands
            const res = 2;
            if (intensity < 1 || duration < 1 || res <= 0) {
                return;
            }
            const len = Math.floor(duration * res);
            let cmds = new Array(len);
            for (let i = 0; i < len; i++) {
                const raw = intensity * easeInOutCubic(1 - (i / len));
                const clamped = Math.min(20, Math.ceil(raw));
                const str = clamped.toString().split(".")[0];
                cmds[i] = "Vibrate:" + str;
            }
            const cmd = cmds.join(",");
            const socket = io(this.socket.socketUrl, {
                path: this.socket.socketPath,
                transports: ["websocket"],
            });
            socket.emit("basicapi_send_toy_command_ts", {
                command: "Function",
                action: cmd,
                timeSec: duration,
                loopRunningSec: 1 / res,
                loopPauseSec: 0.0,
                stopPrevious: 1,
                apiVer: 1,
            });
            socket.disconnect();
        },
    };
}
export function addLovenseRoutes(app) {
    // lovense auth route
    app.post("/lovense/auth", async (req, res) => {
        console.info(`Attempting Lovense auth from ${req.ip}`);
        const pairingCode = req.get("pairing-code");
        if (!pairingCode) {
            console.warn("No pairing code provided");
            res.status(401).send({
                error: "No pairing code provided!"
            });
            return;
        }
        const session = sessions.find(s => s.pairingCode == pairingCode);
        if (!session) {
            // could not find valid session
            console.warn("Invalid pairing code");
            res.status(401).send({
                error: "Invalid pairing code!"
            });
            return;
        }
        const socketInfo = await initSocket(session.id);
        if (socketInfo.error) {
            const err = `Error creating Lovense socket for session ${session.id}: ${socketInfo.error}`;
            console.error(err);
            res.status(500).send({
                error: err
            });
            return;
        }
        const socket = io(socketInfo.socketUrl, {
            path: socketInfo.socketPath,
            transports: ["websocket"],
        });
        const ackId = "qr_" + session.id + "_" + Date.now();
        socket.on("connect", () => {
            socket.emit("basicapi_get_qrcode_ts", {
                ackId: ackId,
            });
        });
        const getQRCode = () => new Promise(resolve => {
            socket.on("basicapi_get_qrcode_tc", (r) => {
                resolve(r);
            });
        });
        const qrResp = await getQRCode();
        let qrData = qrResp ? JSON.parse(qrResp) : {};
        socket.disconnect();
        if (qrData.data && qrData.data.ackId == ackId) {
            console.debug(`Got Lovense qrcode for session ${session.id}`);
            res.status(200).send({
                qrcodeURL: qrData.data.qrcodeUrl
            });
            session.sinks.push(newLovenseSink(socketInfo));
        }
        else {
            const err = `Could not get Lovense qrcode for session ${session.id}`;
            console.error(err);
            res.status(500).send({
                error: err
            });
        }
    });
}
