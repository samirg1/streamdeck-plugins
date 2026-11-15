import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const folder = process.argv[2];
if (!folder) {
    console.error("Usage: npm run version:update -- <folder> [major.minor.patch]");
    process.exitCode = 1;
    process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), `../${folder}`);
const requestedVersion = process.argv[3];

if (requestedVersion && !/^\d+\.\d+\.\d+$/.test(requestedVersion)) {
    console.error("Usage: npm run version:update -- [major.minor.patch]");
    process.exitCode = 1;
} else {
    const version = requestedVersion ?? (await nextPatchVersion());
    const streamDeckVersion = `${version}.0`;
    const updates = [
        {
            path: resolve(root, "package.json"),
            pattern: /(\"version\"\s*:\s*\")[^\"]+(\")/g,
            replacement: `$1${version}$2`,
        },
        {
            path: resolve(root, "com.samir.jira-tickets.sdPlugin/manifest.json"),
            pattern: /^(  \"Version\"\s*:\s*\")[^\"]+(\")/gm,
            replacement: `$1${streamDeckVersion}$2`,
        },
        {
            path: resolve(root, "test/runtime.test.ts"),
            pattern: /(plugin:\s*\{[^{}]*\bversion:\s*\")[^\"]+(\")/g,
            replacement: `$1${streamDeckVersion}$2`,
        },
    ];

    const changedFiles = await Promise.all(
        updates.map(async ({ path, pattern, replacement }) => {
            const contents = await readFile(path, "utf8");
            const matches = [...contents.matchAll(pattern)];
            if (matches.length !== 1) {
                throw new Error(
                    `Expected one version field in ${path}, found ${matches.length}`,
                );
            }
            return { path, contents: contents.replace(pattern, replacement) };
        }),
    );

    await Promise.all(
        changedFiles.map(({ path, contents }) => writeFile(path, contents)),
    );

    console.log(`Updated version to ${version} (${streamDeckVersion} for Stream Deck plugin ${folder})`);
}

async function nextPatchVersion() {
    const packageJson = JSON.parse(
        await readFile(resolve(root, "package.json"), "utf8"),
    );
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(packageJson.version);
    if (!match) {
        throw new Error(`Cannot increment invalid package version: ${packageJson.version}`);
    }

    const [, major, minor, patch] = match;
    return `${major}.${minor}.${Number(patch) + 1}`;
}
