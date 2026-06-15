var MONTHS_SHORT_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatCreatedAt(dateStr) {
    if (!dateStr) return "Пока неизвестно";
    var parts = dateStr.split("-").map(Number);
    var year = parts[0], month = parts[1], day = parts[2];
    if (!year || !month || !day) return "Пока неизвестно";
    return day + " " + MONTHS_SHORT_RU[month - 1] + " " + year;
}

document.addEventListener("DOMContentLoaded", function () {
    var loading = document.getElementById("profileLoading");
    var card = document.getElementById("profileCard");
    var errorEl = document.getElementById("profileError");
    var logoutButton = document.getElementById("logoutButton");

    var logoutConfirmModal = document.getElementById("logoutConfirmModal");
    var cancelLogoutButton = document.getElementById("cancelLogoutButton");
    var confirmLogoutButton = document.getElementById("confirmLogoutButton");

    if (logoutButton) {
        logoutButton.addEventListener("click", function () {
            logoutConfirmModal.classList.remove("hidden");
        });
    }

    if (cancelLogoutButton) {
        cancelLogoutButton.addEventListener("click", function () {
            logoutConfirmModal.classList.add("hidden");
        });
    }

    if (confirmLogoutButton) {
        confirmLogoutButton.addEventListener("click", function () {
            clearAuthToken();
            window.location.replace("/auth.html");
        });
    }

    authFetch("/auth/me")
        .then(function (res) {
            if (!res.ok) {
                throw new Error("fetch_failed");
            }
            return res.json();
        })
        .then(function (user) {
            var displayName = user.displayName || user.name || null;
            var emailLocal = user.email ? user.email.split("@")[0] : null;

            document.getElementById("profileName").textContent =
                displayName || emailLocal || "Путешественник Frogel";
            document.getElementById("profileEmail").textContent =
                user.email || "—";
            document.getElementById("profileCreatedAt").textContent =
                formatCreatedAt(user.createdAt);

            loading.classList.add("hidden");
            card.classList.remove("hidden");
        })
        .catch(function (err) {
            // authFetch already handles 401/403 by clearing token + redirecting.
            // Only show the error block if we're still on the page (network failure etc).
            if (err.message !== "Unauthorized" && err.message !== "Missing auth token") {
                loading.classList.add("hidden");
                errorEl.classList.remove("hidden");
            }
        });
});
