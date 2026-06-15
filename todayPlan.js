const TODAY_PLAN_STORAGE_KEY = "frogel_today_plan_v1";
const TODAY_PLAN_LIMIT = 3;

let _activeRemovePopover = null;
let _removePopoverListenersAdded = false;

let _activeProgressPopover = null;
let _progressPopoverListenersAdded = false;

function getLocalDateKey() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createEmptyTodayPlan() {
    return {
        date: getLocalDateKey(),
        items: [],
        results: {
            done: [],
            inProgress: []
        }
    };
}

function saveTodayPlan(plan) {
    localStorage.setItem(
        TODAY_PLAN_STORAGE_KEY,
        JSON.stringify(plan)
    );
}

function loadTodayPlan() {
    const savedPlan = localStorage.getItem(TODAY_PLAN_STORAGE_KEY);

    if (!savedPlan) {
        const emptyPlan = createEmptyTodayPlan();
        saveTodayPlan(emptyPlan);
        return emptyPlan;
    }

    try {
        const plan = JSON.parse(savedPlan);

        if (plan.date !== getLocalDateKey()) {
            const emptyPlan = createEmptyTodayPlan();
            saveTodayPlan(emptyPlan);
            return emptyPlan;
        }

        return plan;
    } catch (error) {
        const emptyPlan = createEmptyTodayPlan();
        saveTodayPlan(emptyPlan);
        return emptyPlan;
    }
}

function addStepToTodayPlan(step) {
    const todayPlan = loadTodayPlan();

    const alreadyInPlan = todayPlan.items.some(item =>
        !item.completed &&
        String(item.goalId) === String(step.goalId) &&
        Number(item.partIndex) === Number(step.partIndex)
    );

    if (alreadyInPlan) {
        showFrogelToast("Этот шаг уже есть в плане на сегодня 🌿", "info");
        return;
    }

    if (todayPlan.items.length < TODAY_PLAN_LIMIT) {
        todayPlan.items.push(step);
        saveTodayPlan(todayPlan);

        showFrogelToast("Шаг добавлен в план на сегодня 🌱", "success");
        return;
    }

    const completedStepIndex =
        todayPlan.items.findIndex(item => item.completed);

    if (completedStepIndex === -1) {
        showFrogelToast("В плане уже есть 3 шага. Сначала заверши один из них 🌸", "warning");
        return;
    }

    const completedStep =
        todayPlan.items.splice(completedStepIndex, 1)[0];

    const isSameStep = (item, otherItem) =>
        String(item.goalId) === String(otherItem.goalId) &&
        Number(item.partIndex) === Number(otherItem.partIndex);

    todayPlan.results.done =
        todayPlan.results.done.filter(item => !isSameStep(item, completedStep));

    todayPlan.results.inProgress =
        todayPlan.results.inProgress.filter(item => !isSameStep(item, completedStep));

    todayPlan.results.done.push(completedStep);
    todayPlan.items.push(step);

    saveTodayPlan(todayPlan);

    showFrogelToast("Готовый шаг ушёл в итоги дня, новый шаг добавлен в план 🌿", "success");
}

function getTodayPlanItemKey(item) {
    return `${item.goalId}-${item.partIndex}`;
}

function removeDuplicatesFromTodayPlanItems(items) {
    const seenKeys = new Set();

    return items.filter(item => {
        const key = getTodayPlanItemKey(item);

        if (seenKeys.has(key)) {
            return false;
        }

        seenKeys.add(key);
        return true;
    });
}

function syncTodayPlanWithGoals(goals) {
    if (!Array.isArray(goals)) return;
    const todayPlan = loadTodayPlan();

    const syncItem = (item) => {
        const goal = goals.find(goal =>
            String(goal.id) === String(item.goalId)
        );

        if (!goal || !goal.parts || !goal.parts[item.partIndex]) {
            return null;
        }

        const part = goal.parts[item.partIndex];

        return {
            ...item,
            title: part.title,
            goalTitle: goal.title,
            completed: part.completed,
            type: part.type || "NORMAL",
            currentAmount: part.currentAmount || 0,
            targetAmount: part.targetAmount || 0,
            unit: part.unit || ""
        };
    };

        todayPlan.items = removeDuplicatesFromTodayPlanItems(
            todayPlan.items
                .map(syncItem)
                .filter(Boolean)
        );

    const activeKeys = new Set(
        todayPlan.items.map(getTodayPlanItemKey)
    );

        const previousDoneKeys = new Set(
            todayPlan.results.done.map(getTodayPlanItemKey)
        );

        const resultItems = removeDuplicatesFromTodayPlanItems([
            ...todayPlan.results.done,
            ...todayPlan.results.inProgress
        ])
            .filter(item => !activeKeys.has(getTodayPlanItemKey(item)))
            .map(syncItem)
            .filter(Boolean)
            .filter(item => {
                const itemKey = getTodayPlanItemKey(item);

                const wasDoneResult =
                    previousDoneKeys.has(itemKey);

                if (wasDoneResult && !item.completed) {
                    return false;
                }

                return true;
            });

        todayPlan.results.done =
            resultItems.filter(item => item.completed);

        todayPlan.results.inProgress =
            resultItems.filter(item => !item.completed);

    saveTodayPlan(todayPlan);
}

function removeTodayPlanItemsByGoalId(goalId) {
    const todayPlan = loadTodayPlan();

    const isFromDeletedGoal = (item) =>
        String(item.goalId) === String(goalId);

    todayPlan.items =
        todayPlan.items.filter(item => !isFromDeletedGoal(item));

    todayPlan.results.done =
        todayPlan.results.done.filter(item => !isFromDeletedGoal(item));

    todayPlan.results.inProgress =
        todayPlan.results.inProgress.filter(item => !isFromDeletedGoal(item));

    saveTodayPlan(todayPlan);
}

function removeStepFromTodayPlan(goalId, partIndex) {
    const todayPlan = loadTodayPlan();

    const isSameStep = (item) =>
        String(item.goalId) === String(goalId) &&
        Number(item.partIndex) === Number(partIndex);

    todayPlan.items =
        todayPlan.items.filter(item => !isSameStep(item));

    todayPlan.results.inProgress =
        todayPlan.results.inProgress.filter(item => !isSameStep(item));

    saveTodayPlan(todayPlan);
    renderTodayPlan();
    renderDayResults();
}

function closeRemovePopover() {
    if (_activeRemovePopover) {
        _activeRemovePopover.remove();
        _activeRemovePopover = null;
    }
}

function showRemovePopover(anchorButton, onConfirm) {
    closeRemovePopover();

    const popover = document.createElement("div");
    popover.className = "today-plan-remove-popover";
    popover.innerHTML = `
        <p class="today-plan-remove-popover-text">Убрать из плана?</p>
        <div class="today-plan-remove-popover-actions">
            <button type="button" class="today-plan-remove-popover-confirm">Да</button>
            <button type="button" class="today-plan-remove-popover-cancel">Нет</button>
        </div>
    `;

    popover.style.visibility = "hidden";
    popover.style.top = "0";
    popover.style.left = "0";
    document.body.appendChild(popover);
    _activeRemovePopover = popover;

    const popoverRect = popover.getBoundingClientRect();
    const anchorRect = anchorButton.getBoundingClientRect();
    const gap = 6;

    let top = anchorRect.top - popoverRect.height - gap;
    let left = anchorRect.right - popoverRect.width;

    if (top < 8) top = anchorRect.bottom + gap;
    if (left < 8) left = 8;
    if (left + popoverRect.width > window.innerWidth - 8) {
        left = window.innerWidth - popoverRect.width - 8;
    }

    popover.style.top = top + "px";
    popover.style.left = left + "px";
    popover.style.visibility = "";

    popover.querySelector(".today-plan-remove-popover-confirm").addEventListener("click", () => {
        closeRemovePopover();
        onConfirm();
    });

    popover.querySelector(".today-plan-remove-popover-cancel").addEventListener("click", () => {
        closeRemovePopover();
    });

    if (!_removePopoverListenersAdded) {
        _removePopoverListenersAdded = true;

        document.addEventListener("click", (e) => {
            if (_activeRemovePopover && !_activeRemovePopover.contains(e.target)) {
                closeRemovePopover();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && _activeRemovePopover) {
                closeRemovePopover();
            }
        });
    }
}

function closeProgressPopover() {
    if (_activeProgressPopover) {
        _activeProgressPopover.remove();
        _activeProgressPopover = null;
    }
}

function formatMeasuredProgress(item) {
    const current = item.currentAmount || 0;
    const target = item.targetAmount || 0;
    const unit = item.unit || "";
    const unitPart = unit ? " " + unit : "";
    return formatNumber(current) + " из " + formatNumber(target) + unitPart;
}

function showAddProgressPopover(anchorButton, item) {
    closeProgressPopover();
    closeRemovePopover();

    const current = item.currentAmount || 0;
    const target = item.targetAmount || 0;
    const remaining = target > current ? target - current : 0;
    const unit = item.unit || "";

    const popover = document.createElement("div");
    popover.className = "today-plan-progress-popover";
    popover.innerHTML = `
        <p class="today-plan-progress-popover-label">Сколько добавить?</p>
        <input
                type="number"
                class="today-plan-progress-popover-input"
                min="1"
                placeholder="0">
        <p class="today-plan-progress-popover-error hidden"></p>
        <button type="button" class="today-plan-progress-popover-submit">Добавить</button>
    `;

    popover.style.visibility = "hidden";
    popover.style.top = "0";
    popover.style.left = "0";
    document.body.appendChild(popover);
    _activeProgressPopover = popover;

    const popoverRect = popover.getBoundingClientRect();
    const anchorRect = anchorButton.getBoundingClientRect();
    const gap = 6;

    let top = anchorRect.top - popoverRect.height - gap;
    let left = anchorRect.right - popoverRect.width;

    if (top < 8) top = anchorRect.bottom + gap;
    if (left < 8) left = 8;
    if (left + popoverRect.width > window.innerWidth - 8) {
        left = window.innerWidth - popoverRect.width - 8;
    }

    popover.style.top = top + "px";
    popover.style.left = left + "px";
    popover.style.visibility = "";

    const amountInput = popover.querySelector(".today-plan-progress-popover-input");
    const errorEl = popover.querySelector(".today-plan-progress-popover-error");
    const submitBtn = popover.querySelector(".today-plan-progress-popover-submit");

    setTimeout(() => amountInput.focus(), 0);

    function showPopoverError(msg) {
        errorEl.textContent = msg;
        errorEl.classList.remove("hidden");
    }

    function clearPopoverError() {
        errorEl.textContent = "";
        errorEl.classList.add("hidden");
    }

    function handleSubmit() {
        clearPopoverError();

        const valueStr = amountInput.value.trim();
        const amountToAdd = Number(valueStr);

        if (valueStr === "") {
            showPopoverError("Введите количество");
            amountInput.focus();
            return;
        }

        if (amountToAdd <= 0) {
            showPopoverError("Количество должно быть больше 0");
            amountInput.focus();
            return;
        }

        if (target > 0 && amountToAdd > remaining) {
            const unitSuffix = unit ? " " + unit : "";
            showPopoverError("Осталось добавить только " + formatNumber(remaining) + unitSuffix);
            amountInput.focus();
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = "Сохраняем...";

        authFetch(`/goals/${item.goalId}/parts/${item.partIndex}/amount`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amountToAdd: amountToAdd })
        })
            .then(response => {
                if (!response.ok) throw new Error("fail");
                return response.json();
            })
            .then(updatedGoal => {
                closeProgressPopover();

                const todayPlan = loadTodayPlan();
                const planItem = todayPlan.items.find(i =>
                    String(i.goalId) === String(item.goalId) &&
                    Number(i.partIndex) === Number(item.partIndex)
                );

                if (
                    planItem &&
                    updatedGoal &&
                    updatedGoal.parts &&
                    updatedGoal.parts[item.partIndex]
                ) {
                    const updatedPart = updatedGoal.parts[item.partIndex];
                    planItem.currentAmount = updatedPart.currentAmount || 0;
                    planItem.targetAmount = updatedPart.targetAmount || 0;
                    planItem.unit = updatedPart.unit || "";
                    planItem.completed = updatedPart.completed || false;
                    saveTodayPlan(todayPlan);
                }

                renderTodayPlan();
                renderDayResults();
                showFrogelToast("Прогресс добавлен 🌿", "success");
            })
            .catch(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = "Добавить";
                showFrogelToast("Не удалось добавить прогресс. Попробуй ещё раз 🌸", "error");
            });
    }

    submitBtn.addEventListener("click", handleSubmit);

    amountInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            handleSubmit();
        }
    });

    if (!_progressPopoverListenersAdded) {
        _progressPopoverListenersAdded = true;

        document.addEventListener("click", (e) => {
            if (_activeProgressPopover && !_activeProgressPopover.contains(e.target)) {
                closeProgressPopover();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && _activeProgressPopover) {
                closeProgressPopover();
            }
        });
    }
}

function renderDayResults() {
    const todayPlan = loadTodayPlan();

    const doneList =
        document.getElementById("dayResultsDoneList");

    const inProgressList =
        document.getElementById("dayResultsInProgressList");

    if (!doneList || !inProgressList) {
        return;
    }

    doneList.innerHTML = "";
    inProgressList.innerHTML = "";

    const doneItems = removeDuplicatesFromTodayPlanItems([
        ...todayPlan.results.done,
        ...todayPlan.items.filter(item => item.completed)
    ]);

    const doneKeys = new Set(
        doneItems.map(getTodayPlanItemKey)
    );

    const inProgressItems = removeDuplicatesFromTodayPlanItems([
        ...todayPlan.results.inProgress,
        ...todayPlan.items.filter(item => !item.completed)
    ]).filter(item => !doneKeys.has(getTodayPlanItemKey(item)));

    if (doneItems.length === 0) {
        doneList.innerHTML = `
            <p class="day-results-empty">
                Здесь появятся завершённые шаги.
            </p>
        `;
    } else {
        doneItems.forEach(item => {
            const itemElement = document.createElement("div");

            itemElement.className = "day-results-item";

            const progressLine = item.type === "MEASURABLE"
                ? `<span class="day-results-progress">${formatMeasuredProgress(item)}</span>`
                : "";

            itemElement.innerHTML = `
                <span class="day-results-marker done">✓</span>

                <span class="day-results-text">
                    <span class="day-results-title">
                        ${item.title}
                    </span>

                    <span class="day-results-goal">
                        ${item.goalTitle}
                    </span>

                    ${progressLine}
                </span>
            `;

            doneList.appendChild(itemElement);
        });
    }

    if (inProgressItems.length === 0) {
        inProgressList.innerHTML = `
            <p class="day-results-empty">
                Пока всё на сегодня закрыто.
            </p>
        `;
    } else {
        inProgressItems.forEach(item => {
            const itemElement = document.createElement("div");

            itemElement.className = "day-results-item";

            const progressLine = item.type === "MEASURABLE"
                ? `<span class="day-results-progress">${formatMeasuredProgress(item)}</span>`
                : "";

            itemElement.innerHTML = `
                <span class="day-results-marker progress">…</span>

                <span class="day-results-text">
                    <span class="day-results-title">
                        ${item.title}
                    </span>

                    <span class="day-results-goal">
                        ${item.goalTitle}
                    </span>

                    ${progressLine}
                </span>

                <button
                        type="button"
                        class="today-plan-remove-button"
                        aria-label="Убрать из плана">
                    ×
                </button>
            `;

            const removeButton =
                itemElement.querySelector(".today-plan-remove-button");

            removeButton.addEventListener("click", (event) => {
                event.stopPropagation();
                showRemovePopover(removeButton, () => {
                    removeStepFromTodayPlan(item.goalId, item.partIndex);
                });
            });

            inProgressList.appendChild(itemElement);
        });
    }
}

function renderTodayPlan() {
    const todayPlanList = document.getElementById("todayPlanList");
    const todayPlanCounter = document.getElementById("todayPlanCounter");
    const dayResultsButton = document.getElementById("dayResultsButton");

    if (!todayPlanList || !todayPlanCounter || !dayResultsButton) {
        return;
    }

    const todayPlan = loadTodayPlan();

    todayPlanList.innerHTML = "";
    todayPlanCounter.innerText = `${todayPlan.items.length}/${TODAY_PLAN_LIMIT}`;

    const hasResults =
        todayPlan.results.done.length > 0 ||
        todayPlan.items.some(item => item.completed);

    if (hasResults) {
        dayResultsButton.classList.remove("hidden");
    } else {
        dayResultsButton.classList.add("hidden");
    }

    if (todayPlan.items.length === 0) {
        todayPlanList.innerHTML = `
            <div class="today-plan-empty">
                <p class="empty-state-title">Пока план пустой</p>
                <p class="empty-state-text">Открой цель и добавь подходящий шаг на сегодня.</p>
            </div>
        `;

        return;
    }

    todayPlan.items.forEach((item) => {
        if (item.type === "MEASURABLE") {
            const itemElement = document.createElement("div");

            itemElement.className = item.completed
                ? "today-plan-item today-plan-item--measurable completed"
                : "today-plan-item today-plan-item--measurable";

            itemElement.innerHTML = `
                <span class="today-plan-item-text">
                    <span class="today-plan-item-title">
                        ${item.title}
                    </span>

                    <span class="today-plan-item-goal">
                        ${item.goalTitle}
                    </span>

                    <span class="today-plan-item-progress-text">
                        ${formatMeasuredProgress(item)}
                    </span>
                </span>

                ${!item.completed ? `
                <button
                        type="button"
                        class="today-plan-add-progress-btn"
                        aria-label="Добавить прогресс">
                    + Прогресс
                </button>
                ` : ""}

                <button
                        type="button"
                        class="today-plan-remove-button"
                        aria-label="Убрать из плана">
                    ×
                </button>
            `;

            const addProgressButton =
                itemElement.querySelector(".today-plan-add-progress-btn");

            const removeButton =
                itemElement.querySelector(".today-plan-remove-button");

            if (addProgressButton) {
                addProgressButton.addEventListener("click", (event) => {
                    event.stopPropagation();
                    showAddProgressPopover(addProgressButton, item);
                });
            }

            removeButton.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                showRemovePopover(removeButton, () => {
                    removeStepFromTodayPlan(item.goalId, item.partIndex);
                });
            });

            todayPlanList.appendChild(itemElement);
            return;
        }

        const itemElement = document.createElement("label");

        itemElement.className =
            item.completed
                ? "today-plan-item completed"
                : "today-plan-item";

        itemElement.innerHTML = `
            <input
                    type="checkbox"
                    ${item.completed ? "checked" : ""}>

            <span class="today-plan-item-text">
                <span class="today-plan-item-title">
                    ${item.title}
                </span>

                <span class="today-plan-item-goal">
                    ${item.goalTitle}
                </span>
            </span>

            <button
                    type="button"
                    class="today-plan-remove-button"
                    aria-label="Убрать из плана">
                ×
            </button>
        `;

        const checkbox = itemElement.querySelector("input");

        const removeButton =
            itemElement.querySelector(".today-plan-remove-button");

        removeButton.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();

            showRemovePopover(removeButton, () => {
                removeStepFromTodayPlan(item.goalId, item.partIndex);
            });
        });

        checkbox.addEventListener("change", () => {
            authFetch(`/goals/${item.goalId}/parts/${item.partIndex}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    completed: checkbox.checked
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Не удалось обновить шаг");
                    }

                    return response.json();
                })
                .then(() => {
                    item.completed = checkbox.checked;
                    saveTodayPlan(todayPlan);

                    location.reload();
                })
                .catch(() => {
                    checkbox.checked = !checkbox.checked;
                    showFrogelToast("Не удалось обновить шаг в цели. Попробуй ещё раз 🌸", "error");
                });
        });

        todayPlanList.appendChild(itemElement);
    });
}