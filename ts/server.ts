import * as path from 'path';
import {exec} from 'child_process';
import express from 'express';
let app = express();
const port = "2000";

app.use(express.static("./", {
    index: "./index.html"
}));

app.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(`Server listening at ${url}`);

    let cmd = path.join(__dirname, "xdg-open");
    if (process.platform === "darwin") cmd = "open";
    else if (process.platform === "win32") cmd = `start ""`;

    exec(`${cmd} ${url}`);
});
