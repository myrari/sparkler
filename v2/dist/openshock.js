import { sessions } from "./api.js";
function newOpenShockSink(token) {
    return {
        host: "https://api.openshock.app",
        userAgent: "Sparkler API/1.0 (myra@myrari.net)",
        token: token,
        // use sound & vibrate by default
        sound: false,
        vibrate: false,
        // no shockers by default
        shockers: [],
        async send(intensity, duration) {
            // clamp intensity
            const intens = +Math.min(100, Math.max(0, intensity)).toFixed(0);
            // convert duration to millis & clamp
            const dur = +Math.min(65535, Math.max(300, duration * 1000)).toFixed(0);
            let req = {
                shocks: [],
            };
            // send to all connected shockers
            for (let i = 0; i < this.shockers.length; i++) {
                // main shock control
                req.shocks.push({
                    id: this.shockers[i],
                    intensity: intens,
                    duration: dur,
                    type: "Shock",
                    exclusive: false,
                });
                // possible sound control
                if (this.sound) {
                    req.shocks.push({
                        id: this.shockers[i],
                        intensity: intens,
                        duration: dur,
                        type: "Sound",
                        exclusive: false,
                    });
                }
                // possible vibrate control
                if (this.vibrate) {
                    req.shocks.push({
                        id: this.shockers[i],
                        intensity: intens,
                        duration: dur,
                        type: "Vibrate",
                        exclusive: false,
                    });
                }
            }
            const body = JSON.stringify(req);
            console.debug("OpenShock request body: " + body);
            // send API request
            const res = await fetch(this.host + "/2/shockers/control", {
                method: "POST",
                headers: {
                    "User-Agent": this.userAgent,
                    "Content-Type": "application/json",
                    "OpenShockToken": this.token,
                },
                body: body,
            });
            if (res.status == 200) {
                // sent succesfully!
                console.debug("Succesfully sent OpenShock commands");
            }
            else {
                // error occurred
                console.error("Error sending OpenShock commands: " + res.status);
                // console.error(res);
                // console.error(await res.json());
            }
        },
    };
}
export function addOpenShockRoutes(app) {
    // openshock auth route
    app.post("/openshock/auth", (req, res) => {
        console.info(`Attempting OpenShock auth from ${req.ip}`);
        const pairingCode = req.get("pairing-code");
        if (!pairingCode) {
            console.warn("No pairing code provided");
            res.status(401).send({
                error: "No pairing code provided!"
            });
            return;
        }
        if (!req.body) {
            console.error(`No body provided`);
            res.status(400).send({
                error: "No body provided"
            });
            return;
        }
        if (!req.body.token || !req.body.shockers) {
            console.error(`Missing required paramaters`);
            res.status(400).send({
                error: "Malformed pair request"
            });
            return;
        }
        const token = req.body.token;
        const shockers = req.body.shockers;
        // const openShockToken = req.get("OpenShockToken");
        // if (!openShockToken) {
        //     console.warn("No OpenShock API token provided");
        //     res.status(401).send({
        //         error: "No OpenShock API token provided!"
        //     });
        //     return;
        // }
        const session = sessions.find(s => s.pairingCode == pairingCode);
        if (!session) {
            // could not find valid session
            console.warn("Invalid pairing code");
            res.status(401).send({
                error: "Invalid pairing code!"
            });
            return;
        }
        const sink = newOpenShockSink(token);
        sink.shockers = shockers;
        session.sinks.push(sink);
        res.sendStatus(200);
    });
}
