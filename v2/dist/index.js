import express from "express";
import { fileURLToPath } from "url";
import { dirname } from "path";
const root = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT;
const app = express();
app.use(express.json());
app.use(express.urlencoded());
/** MAIN ROUTES */
app.get("/", (_req, res) => {
    res.sendFile("index.html", {
        root: root,
    });
});
/** IMMEDIATE LOGIC */
// start the server
app.listen(PORT, () => {
    console.info(`The server is running at http://localhost:${PORT}`);
});
