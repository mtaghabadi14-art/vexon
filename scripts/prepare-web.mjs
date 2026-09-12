import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const output = path.join(root, "www");

await rm(output, {
    recursive: true,
    force: true
});

await mkdir(output, {
    recursive: true
});

const files = [
    "index.html",
    "style.css",
    "script.js",
    "vexon-nav.js",
    "pgame-api-bridge.js"
];

for (const file of files) {
    await cp(
        path.join(root, file),
        path.join(output, file)
    );
}

for (const directory of ["assets", "sections"]) {
    await cp(
        path.join(root, directory),
        path.join(output, directory),
        { recursive: true }
    );
}

console.log("✅ PGame web bundle prepared successfully.");