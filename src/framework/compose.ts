import type { Context } from "./context.js";

export type Next = () => Promise<void>;
export type Middleware = (ctx: Context, next: Next) => Promise<void> | void;

export function compose(middleware: Middleware[]) {
    return function (ctx: Context, next?: Next): Promise<void> {
        let lastDispatchedIndex = -1;
        function dispatch(i: number): Promise<void> {
            if (i <= lastDispatchedIndex) {
                return Promise.reject(new Error("FATAL: next() called multiple times inside a single middleware."));
            }
            lastDispatchedIndex = i;
            const fn = middleware[i] || next;

            if (!fn) {
                return Promise.resolve();
            }

            try {
                return Promise.resolve(fn(ctx, () => dispatch(i + 1)));
            } catch (err) {
                return Promise.reject(err);
            }
        }
        return dispatch(0);
    };
}