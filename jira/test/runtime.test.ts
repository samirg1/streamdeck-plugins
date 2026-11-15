import assert from "assert";
import { spawn, type ChildProcess } from "node:child_process";
import test from "node:test";
import { WebSocket, WebSocketServer } from "ws";

test("built plugin registers with a Stream Deck websocket and stays alive", async (context) => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 });
    let child: ChildProcess | undefined;
    context.after(() => {
        child?.kill();
        server.close();
    });

    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.equal(typeof address, "object");
    if (!address || typeof address === "string")
        throw new Error("WebSocket server has no TCP port");

    let pluginSocket: WebSocket | undefined;
    const registration = new Promise<Record<string, unknown>>(
        (resolve, reject) => {
            server.once("connection", (socket) => {
                pluginSocket = socket;
                socket.once("message", (data) =>
                    resolve(JSON.parse(data.toString())),
                );
            });
            server.once("error", reject);
        },
    );

    const info = JSON.stringify({
        application: {
            font: "Arial",
            language: "en",
            platform: "mac",
            platformVersion: "15",
            version: "7.6",
        },
        colors: {},
        devices: [
            {
                id: "device-1",
                name: "Test Mini",
                size: { columns: 3, rows: 2 },
                type: 1,
            },
        ],
        devicePixelRatio: 2,
        plugin: { uuid: "com.samir.jira-tickets", version: "0.3.7.0" },
    });
    child = spawn(
        process.execPath,
        [
            "com.samir.jira-tickets.sdPlugin/bin/index.js",
            "-port",
            String(address.port),
            "-pluginUUID",
            "com.samir.jira-tickets",
            "-registerEvent",
            "registerPlugin",
            "-info",
            info,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr?.on("data", (data) => {
        stderr += data.toString();
    });
    const earlyExit = new Promise<never>((_, reject) => {
        child?.once("exit", (code, signal) =>
            reject(
                new Error(
                    `Plugin exited before registering (code=${code}, signal=${signal}): ${stderr}`,
                ),
            ),
        );
    });

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error("Plugin did not register within 2 seconds")),
            2000,
        );
    });
    const message = await Promise.race([registration, earlyExit, timeout]);
    clearTimeout(timer);
    assert.equal(message.event, "registerPlugin");
    assert.equal(message.uuid, "com.samir.jira-tickets");

    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.equal(child.exitCode, null, "plugin exited after registering");

    if (!pluginSocket) throw new Error("Plugin websocket was not captured");
    const settingsRequest = waitForMessage(
        pluginSocket,
        (value) => value.event === "getGlobalSettings",
    );
    pluginSocket.send(
        JSON.stringify({
            action: "com.samir.jira-tickets.issue",
            context: "action-1",
            device: "device-1",
            event: "willAppear",
            payload: {
                controller: "Keypad",
                coordinates: { column: 0, row: 0 },
                isInMultiAction: false,
                resources: {},
                settings: {},
                state: 0,
            },
        }),
    );

    const request = await settingsRequest;
    const demoImage = waitForMessage(
        pluginSocket,
        (value) =>
            value.event === "setImage" &&
            String(value.payload?.image).includes("DEMO-3569"),
    );
    pluginSocket.send(
        JSON.stringify({
            event: "didReceiveGlobalSettings",
            id: request.id,
            payload: { settings: { demoMode: true } },
        }),
    );
    const imageCommand = await demoImage;
    assert.equal(imageCommand.context, "action-1");

    for (let slot = 1; slot < 5; slot++) {
        pluginSocket.send(
            JSON.stringify({
                action: "com.samir.jira-tickets.issue",
                context: `action-${slot + 1}`,
                device: "device-1",
                event: "willAppear",
                payload: {
                    controller: "Keypad",
                    coordinates: {
                        column: slot % 3,
                        row: Math.floor(slot / 3),
                    },
                    isInMultiAction: false,
                    resources: {},
                    settings: {},
                    state: 0,
                },
            }),
        );
    }

    const startImage = waitForMessage(
        pluginSocket,
        (value) =>
            value.event === "setImage" &&
            value.context === "action-4" &&
            decodeURIComponent(String(value.payload?.image)).includes(
                "START",
            ),
    );
    pluginSocket.send(
        JSON.stringify({
            action: "com.samir.jira-tickets.issue",
            context: "action-1",
            device: "device-1",
            event: "keyDown",
            payload: {
                controller: "Keypad",
                coordinates: { column: 0, row: 0 },
                isInMultiAction: false,
                settings: {},
                state: 0,
            },
        }),
    );
    await startImage;

    const ticketList = waitForMessage(
        pluginSocket,
        (value) =>
            value.event === "setImage" &&
            value.context === "action-2" &&
            String(value.payload?.image).includes("DEMO-3102"),
    );
    pluginSocket.send(
        JSON.stringify({
            action: "com.samir.jira-tickets.issue",
            context: "action-3",
            device: "device-1",
            event: "keyDown",
            payload: {
                controller: "Keypad",
                coordinates: { column: 2, row: 0 },
                isInMultiAction: false,
                settings: {},
                state: 0,
            },
        }),
    );
    await ticketList;
});

function waitForMessage(
    socket: WebSocket,
    predicate: (value: Record<string, any>) => boolean,
): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off("message", listener);
            reject(new Error("Timed out waiting for plugin message"));
        }, 2000);
        const listener = (data: WebSocket.RawData) => {
            const value = JSON.parse(data.toString()) as Record<string, any>;
            if (!predicate(value)) return;
            clearTimeout(timer);
            socket.off("message", listener);
            resolve(value);
        };
        socket.on("message", listener);
    });
}
