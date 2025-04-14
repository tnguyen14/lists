// @ts-check
import { writable } from "svelte/store";
export const isAuthenticated = writable(false);
export const user = writable({});
export const AUTH_STATUSES = {
    initial: "",
    pendingVerify: "Verifying authentication",
    loggedIn: "User is logged in",
    pendingLogout: "Logging out...",
    error: "Authentication error occurred"
}
export const authStatus = writable(AUTH_STATUSES.initial);
export const errorMessage = writable('');
export const token = writable('');
export const isSuperAdmin = writable(false);
