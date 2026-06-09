function parseDeadlineDate(deadline) {
    if (!deadline) {
        return null;
    }

    const [year, month, day] = deadline.split("-").map(Number);

    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day);
}

function formatRoutePointDate(deadline) {
    const date = parseDeadlineDate(deadline);

    if (!date) {
        return "Без срока";
    }

    return date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function getRoutePointStatus(deadline, emptyText = "Без срока") {
    const routePointDate = parseDeadlineDate(deadline);

    if (!routePointDate) {
        return {
            text: emptyText,
            className: "route-point-empty"
        };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    routePointDate.setHours(0, 0, 0, 0);

    const differenceInDays = Math.ceil(
        (routePointDate - today) / (1000 * 60 * 60 * 24)
    );

    if (differenceInDays < 0) {
        return {
            text: "Срок прошел",
            className: "route-point-past"
        };
    }

    if (differenceInDays <= 7) {
        return {
            text: "Приближение к сроку",
            className: "route-point-soon"
        };
    }

    return {
        text: "По плану",
        className: "route-point-far"
    };
}