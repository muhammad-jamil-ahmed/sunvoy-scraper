export interface RawUser {
    id: number;
    name: string;
    email: string;
}

export interface User {
    readonly id: number;
    readonly name: string;
    readonly email: string;
}

export const makeUser = (raw: RawUser): User => {
    if (!raw?.id || !raw?.email) throw new Error("Invalid user payload");
    return Object.freeze({ id: raw.id, name: raw.name, email: raw.email });
};
