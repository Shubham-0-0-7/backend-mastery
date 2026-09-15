import net from "node:net";

const PORT = 3000;
const HOST = "127.0.0.1";

const server = net.createServer((socket: net.Socket) => {
    const clientEndpoint = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[+] new TCP connection established from ${clientEndpoint}`);

    socket.setNoDelay(true);
    socket.setTimeout(30000);

    socket.on("data", (chunk: Buffer) => {
        console.log(`\n[<<<] Received ${chunk.length} bytes from ${clientEndpoint}:`);
        const hex = chunk.subarray(0, 64).toString("hex").match(/../g)?.join(" ") || "";
        console.log(`Hex (first 64 bytes): ${hex}`);

        const preview = chunk
          .toString("latin1")
          .replace(/\r/g, "\\r")
          .replace(/\n/g, "\\n\n");
        console.log(`Payload preview:\n${preview}`);

        const body = `Hello from Raw TCP Socket! Client: ${clientEndpoint}\n`;
        const response = [
            "HTTP/1.1 200 OK",
            "Content-Type: text/plain",
            `Content-Length: ${Buffer.byteLength(body)}`,
            "Connection: close",
            "",
            body,
        ].join("\r\n");

        socket.write(response, () => {
            socket.end();
        });
    });

    socket.on("timeout", () => {
        console.warn(`[!] Socket timeout on ${clientEndpoint}. Terminating.`);
        socket.destroy();
    });

    socket.on("end", () => {
        console.log(`[-] Client initiated FIN disconnect: ${clientEndpoint}`);
    });

    socket.on("close", (hadError) => {
        console.log(`[x] Connection closed for ${clientEndpoint} (hadError: ${hadError})`);
    });

    socket.on("error", (err) => {
        console.error(`[!] Socket error on ${clientEndpoint}:`, err.message);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`[*] TCP Server listening on ${HOST}:${PORT}`);
    console.log(`[*] Process ID: ${process.pid}`);
});