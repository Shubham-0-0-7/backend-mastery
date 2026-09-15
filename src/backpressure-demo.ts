import net from "node:net";

const PORT = 3001;
const HOST = "127.0.0.1";

const server = net.createServer((socket: net.Socket) => {
    const client = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[+] Client connected: ${client}`);

    const TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB
    const CHUNK_SIZE = 64 * 1024;         // 64 KB
    const chunk = Buffer.alloc(CHUNK_SIZE, "A");

    let bytesSent = 0;
    let drainCount = 0;

    function sendData() {
        let canContinue = true;

        while (bytesSent < TOTAL_BYTES && canContinue) {
            bytesSent += chunk.length;
            canContinue = socket.write(chunk);

            if (!canContinue) {
                console.warn(
                    `[!] Backpressure triggered! Kernel buffer full. ` +
                    `User-space queued: ${socket.bufferSize} bytes. Pausing writes...`
                );
            }
        }

        if (bytesSent >= TOTAL_BYTES) {
            console.log(`[✓] Completed sending ${TOTAL_BYTES} bytes. Closing connection.`);
            socket.end();
        }
    }

    // Register event listeners once per connection (not inside sendData)
    socket.on("drain", () => {
        drainCount++;
        console.log(`[>>>] 'drain' event #${drainCount} fired! Kernel buffer has room. Resuming writes...`);
        sendData();
    });

    socket.on("error", (err) => {
        console.error(`[!] Socket error: ${err.message}`);
    });

    socket.on("close", () => {
        console.log(`[-] Client disconnected: ${client}`);
    });

    // Start initial write
    sendData();
});

server.listen(PORT, HOST, () => {
    console.log(`[*] Backpressure Demo Server listening on ${HOST}:${PORT}`);
});