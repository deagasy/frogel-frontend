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
    window.location.replace("/auth.html");
}

function requireAuth() {
    var token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) {
        window.location.replace("/auth.html");
        throw new Error("Missing auth token");
    }
    return token;
}

function protectPage() {
    requireAuth();

    window.addEventListener("pageshow", function () {
        if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
            window.location.replace("/auth.html");
        }
    });

    window.addEventListener("focus", function () {
        if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
            window.location.replace("/auth.html");
        }
    });
}

async function authFetch(path, options) {
    const opts = (options !== undefined) ? options : {};
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
        window.location.replace("/auth.html");
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
        window.location.replace("/auth.html");
        throw new Error("Unauthorized");
    }

    return response;
}
