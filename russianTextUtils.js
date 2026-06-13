function formatNumber(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        return value ?? "";
    }
    const parts = String(number).split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return parts.join(".");
}

function getRussianPluralForm(count, one, few, many) {
    const n = Math.abs(count);
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 19) return many;
    if (mod10 === 1) return one;
    if (mod10 >= 2 && mod10 <= 4) return few;
    return many;
}

function formatStepCount(count) {
    return `${count} ${getRussianPluralForm(count, "шаг", "шага", "шагов")}`;
}

function formatStepProgress(completed, total) {
    const totalForm = getRussianPluralForm(total, "шага", "шагов", "шагов");
    return `${completed} из ${total} ${totalForm}`;
}

const MONTHS_SHORT_RU = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function formatShortGoalDate(deadline) {
    const date = parseDeadlineDate(deadline);
    if (!date) return "Без срока";
    return `${date.getDate()} ${MONTHS_SHORT_RU[date.getMonth()]} ${date.getFullYear()}`;
}

function formatStepDeadlineLabel(deadline) {
    const date = parseDeadlineDate(deadline);
    if (!date) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    const diffDays = Math.round((date - today) / (1000 * 60 * 60 * 24));

    const sameYear = date.getFullYear() === today.getFullYear();
    const label = sameYear
        ? `${date.getDate()} ${MONTHS_SHORT_RU[date.getMonth()]}`
        : `${date.getDate()} ${MONTHS_SHORT_RU[date.getMonth()]} ${date.getFullYear()}`;

    let modifier;
    if (diffDays < 0)       modifier = "past";
    else if (diffDays <= 7) modifier = "soon";
    else                    modifier = "far";

    return { label, modifier };
}
