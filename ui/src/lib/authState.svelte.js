export function getAuth() {
    let authState = $state({
        isAuthenticated: false,
        isLoadingAuth: false,
        authStatus: "Checking authentication...",
        token: null,
        user: null,
    });

    return {
        get state() {
            return authState;
        }
    }
}
