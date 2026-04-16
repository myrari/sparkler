import { randomUUID } from "crypto";
import { Express } from "express";

interface SessionData {
    secret: string;
    pairingCode: string;

    timeCreated: Date;

    IP: string;
    strictIP: boolean;

    timesPaired: number;
    allowMultiPair: boolean;
}

// let sessions: Record<string, SessionData> = {};
let sessions: Array<SessionData> = [];

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

        for (const session of sessions) {
            if (session.secret == secret) {
                // we have a valid session!
                if (session.strictIP && session.IP != req.ip) {
                    // correct secret, but incorrect connection IP
                    console.warn(`${req.ip} sent a command with correct secret, but incorrect IP address! Secret may be compromised`);
                    res.status(403).send({
                        error: "Failed IP address check"
                    });
                    return;
                }

                console.info(`sparkle for session from ${session.IP}!`);

                res.sendStatus(200);
                return;
            }
        }

        // could not find valid session
        console.warn(`${req.ip} send command with invalid secret`);
        res.status(401).send({
            error: "Invalid session secret! Did you pair first?"
        });
        return;

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
            secret: randomUUID().toString(),
            pairingCode: randomUUID().toString(),
            timeCreated: new Date(),
            IP: req.ip,
            // use strict ip checking by default
            strictIP: true,
            timesPaired: 0,
            // for now, no multi-pairing
            allowMultiPair: false,
        }
        sessions.push(newSession);

        res.send({
            pairingCode: newSession.pairingCode
        });
    });

    app.post("/auth", (req, res) => {
        console.info(`Secret exchange request from ${req.ip}`);

        const pairingCode = req.get("pairing-code");

        for (const session of sessions) {
            if (session.pairingCode == pairingCode) {
                // found valid session!

                if (session.timesPaired < 1 || session.allowMultiPair) {
                    // session can be paired!
                    console.info("Session succesfully paired");
                    res.status(200).send({
                        secret: session.secret
                    });
                } else {
                    // session cannot be paired again
                    console.warn("Cannot pair, session already paired");
                    res.status(403).send({
                        error: "Session already paired!"
                    });
                }

                return;
            }
        }

        // could not find valid session
        console.warn("Invalid pairing code");
        res.status(401).send({
            error: "Invalid pairing code!"
        });
    });
}
