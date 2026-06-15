const AUTH_TOKEN_KEY = "frogel_auth_token";

function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setAuthToken(token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearAuthToken() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
}

function isAuthenticated() {
    return !!getAuthToken();
}

function redirectToAuth() {
    window.location.href = "/auth.html";
}

function requireAuth() {
    if (!isAuthenticated()) {
        redirectToAuth();
    }
}

async function authFetch(path, options) {
    const opts = (options !== undefined) ? options : {};
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
        window.location.href = "/auth.html";
        throw new Error("Missing auth token");
    }

    const headers = {
        ...(opts.headers || {}),
        Authorization: "Bearer " + token
    };

    const url = path.startsWith("http") ? path : apiUrl(path);

    const response = await fetch(url, { ...opts, headers });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        window.location.href = "/auth.html";
        throw new Error("Unauthorized");
    }

    return response;
}
