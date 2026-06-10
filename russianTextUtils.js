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
