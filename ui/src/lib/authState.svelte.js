// @ts-check

import { writable } from "svelte/store";

export const isAuthenticated = writable(false);

export const user = writable({});

export const AUTH_STATUSES = {
    initial: "Please log in to use the app",
    pendingVerify: "Verifying authentication",
    loggedIn: "User is logged in",
    pendingLogout: "Logging out..."
}
export const authStatus = writable(AUTH_STATUSES.initial);

export const token = writable('');