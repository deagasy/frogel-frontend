function showFrogelToast(message, type) {
    try {
        var container = document.getElementById("frogel-toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "frogel-toast-container";
            document.body.appendChild(container);
        }

        var toast = document.createElement("div");
        toast.className = "frogel-toast frogel-toast--" + (type || "info");
        toast.textContent = message;
        container.appendChild(toast);

        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                toast.classList.add("frogel-toast--visible");
            });
        });

        setTimeout(function() {
            toast.classList.remove("frogel-toast--visible");
            setTimeout(function() {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    } catch (e) {
        // fail safely
    }
}
