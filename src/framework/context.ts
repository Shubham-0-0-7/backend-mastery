import type { IncomingMessage, ServerResponse } from "node:http";
import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export interface RequestContextData {
    requestId: string;
    startTime: bigint;
    user?: { id: string; role: string };
}

export const requestStorage = new AsyncLocalStorage<RequestContextData>();

export class Context {
    public readonly req: IncomingMessage;
    public readonly res: ServerResponse;
    public readonly requestId: string;
    public readonly params: Record<string, string> = {};
    public body: unknown = null;
    public status: number = 200;

    constructor(req: IncomingMessage, res: ServerResponse) {
        this.req = req;
        this.res = res;

        this.requestId = (req.headers["x-request-id"] as string) || randomUUID();
    }

    public json(data: unknown, statusCode: number = 200): void {
        this.status = statusCode;
        if (!this.res.headersSent) {
            this.res.setHeader("Content-Type", "application/json");
            this.res.setHeader("X-Request-ID", this.requestId);
            this.res.writeHead(this.status);
        }
        this.res.end(JSON.stringify(data));
    }
    public text(text: string, statusCode: number = 200): void {
        this.status = statusCode;
        if (!this.res.headersSent) {
          this.res.setHeader("Content-Type", "text/plain");
          this.res.setHeader("X-Request-ID", this.requestId);
          this.res.writeHead(this.status);
        }
        this.res.end(text);
    }
}