import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { addAPIRoutes } from "./api.js";

const root = dirname(fileURLToPath(import.meta.url))

const PORT = process.env.PORT;

const app = express()

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

/** ADD EXTRA ROUTES */

addAPIRoutes(app);

/** IMMEDIATE LOGIC */

// start the server
app.listen(PORT, () => {
    console.info(`The server is running at http://localhost:${PORT}`);
});
