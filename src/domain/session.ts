export interface Session {
    readonly value: string;
    isEmpty(): boolean;
}

export const makeSession = (rawCookie: string): Session =>
    Object.freeze({
        value: rawCookie.split(";")[0],
        isEmpty() {
            return !this.value;
        }
    });
