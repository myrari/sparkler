import express from "express";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url))

const port = process.env.PORT;

const app = express();

app.get("/", (_req, res) => {
    res.sendFile("main.html", {
        root: root,
    })
});

app.listen(port, () => {
    console.log(`The server is running at http://localhost:${port}`);
});
