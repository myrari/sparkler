import { randomInt, randomUUID } from "crypto";
import { Express } from "express";

import { addLovenseRoutes } from "./lovense.js";
import { addOpenShockRoutes } from "./openshock.js";

export interface Sink {
    send: (intensity: number, duration: number) => void;
}

export interface SessionData {
    id: string;
    secret: string;
    pairingCode: string;

    timeCreated: Date;

    IP: string;
    strictIP: boolean;

    sourcesPaired: number;
    allowMultiSource: boolean;

    sinks: Array<Sink>;
}

export let sessions: Array<SessionData> = [];

function newPairingCode(): string {
    let out = "";

    // generate a sequence of digits
    const DIGITS = 6;

    for (let i = 0; i < DIGITS; i++) {
        out += randomInt(10).toString();
    }

    return out;
}

export function addAPIRoutes(app: Express) {
    // main api
    app.post("/sparkle", (req, res) => {
        const secret = req.get("secret");
        if (!secret) {
            // no secret provided
            console.warn(`${req.ip} send command with no secret`);
            res.status(401).send({
                error: "No session secret provided! Did you pair first?"
            });
            return;
        }

        const session = sessions.find(s => s.secret == secret);
        if (!session) {
            // could not find valid session
            console.warn(`Source ${req.ip} send command with invalid secret`);
            res.status(401).send({
                error: "Invalid session secret! Did you pair first?"
            });
            return;
        }

        if (session.strictIP && session.IP != req.ip) {
            // correct secret, but incorrect connection IP
            console.warn(`Source ${req.ip} sent a command with correct secret, but incorrect IP address! Secret may be compromised`);
            res.status(403).send({
                error: "Failed IP address check"
            });
            return;
        }

        console.info(`sparkle for session from ${session.IP}!`);

        if (!req.body) {
            console.error(`Source ${req.ip} sent command with no body!`);

            res.status(400).send({
                error: "No command body provided"
            });
            return;
        }
        if (!req.body.intensity || !req.body.duration) {
            console.error(`Source ${req.ip} sent command without required parameters!`);
            res.status(400).send({
                error: "Malformed command"
            });
            return;
        }
        const intensity: number = req.body.intensity;
        const duration: number = req.body.duration;

        // send to all sinks for this session
        for (const sink of session.sinks) {
            sink.send(intensity, duration);
        }

        res.sendStatus(200);
    });

    // auth flow:
    // 1. user visits website and generates a new Pairing Code & Session Secret
    // 2. user gives Pairing Code to client
    // 3. client sends Pairing Code to server
    // 4. if valid, server sends corresponding Session Secret to client
    // 5. client sends Session Secret with all commands
    // 6. server uses Session Secret to forward commands accordingly

    app.post("/new-session", (req, res) => {
        console.info(`New session requested from ${req.ip}`);

        if (!req.ip) {
            res.status(400).send({
                error: "Invalid IP address!"
            });
            return;
        }

        const newSession: SessionData = {
            id: randomUUID().toString(),
            secret: randomUUID().toString(),
            pairingCode: newPairingCode(),
            timeCreated: new Date(),
            IP: req.ip,
            strictIP: true,
            sourcesPaired: 0,
            // for now, no multi-pairing
            allowMultiSource: false,
            // no sinks to start
            sinks: [],
        }
        sessions.push(newSession);

        res.send({
            pairingCode: newSession.pairingCode
        });
    });

    app.post("/auth", (req, res) => {
        console.info(`Source pairing request from ${req.ip}`);

        const pairingCode = req.get("pairing-code");

        const session = sessions.find(s => s.pairingCode == pairingCode);
        if (!session) {
            // could not find valid session
            console.warn("Invalid pairing code");
            res.status(401).send({
                error: "Invalid pairing code!"
            });
            return;
        }

        if (session.sourcesPaired < 1 || session.allowMultiSource) {
            // source can be paired!
            console.info("Source succesfully paired");
            res.status(200).send({
                secret: session.secret
            });
        } else {
            // session cannot be paired again
            console.warn("Cannot pair, session already paired to source");
            res.status(403).send({
                error: "Session already paired to source!"
            });
        }
    });

    // add sink routes
    addLovenseRoutes(app);
    addOpenShockRoutes(app);
}
