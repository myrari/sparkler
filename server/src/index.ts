import express from "express";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
    res.sendFile("main.html", {
        root: root,
    })
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
