const TODAY_PLAN_STORAGE_KEY = "frogel_today_plan_v1";
const TODAY_PLAN_LIMIT = 3;

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
        String(item.goalId) === String(step.goalId) &&
        Number(item.partIndex) === Number(step.partIndex)
    );

    if (alreadyInPlan) {
        alert("Этот шаг уже есть в плане на сегодня 🌿");
        return;
    }

    if (todayPlan.items.length < TODAY_PLAN_LIMIT) {
        todayPlan.items.push(step);
        saveTodayPlan(todayPlan);

        alert("Шаг добавлен в план на сегодня 🌱");
        return;
    }

    const completedStepIndex =
        todayPlan.items.findIndex(item => item.completed);

    if (completedStepIndex === -1) {
        alert("В плане уже есть 3 шага. Сначала заверши один из них 🌸");
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

    alert("Готовый шаг ушёл в итоги дня, новый шаг добавлен в план 🌿");
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
            completed: part.completed
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
                Пока здесь пусто. Выполненные и заменённые шаги появятся тут 🌿
            </p>
        `;
    } else {
        doneItems.forEach(item => {
            const itemElement = document.createElement("div");

            itemElement.className = "day-results-item";

            itemElement.innerHTML = `
                <span class="day-results-marker done">✓</span>

                <span class="day-results-text">
                    <span class="day-results-title">
                        ${item.title}
                    </span>

                    <span class="day-results-goal">
                        ${item.goalTitle}
                    </span>
                </span>
            `;

            doneList.appendChild(itemElement);
        });
    }

    if (inProgressItems.length === 0) {
        inProgressList.innerHTML = `
            <p class="day-results-empty">
                Сейчас все шаги на сегодня уже пройдены.
            </p>
        `;
    } else {
        inProgressItems.forEach(item => {
            const itemElement = document.createElement("div");

            itemElement.className = "day-results-item";

            itemElement.innerHTML = `
                <span class="day-results-marker progress">…</span>

                <span class="day-results-text">
                    <span class="day-results-title">
                        ${item.title}
                    </span>

                    <span class="day-results-goal">
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

            const removeButton =
                itemElement.querySelector(".today-plan-remove-button");

            removeButton.addEventListener("click", () => {
                removeStepFromTodayPlan(item.goalId, item.partIndex);
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
                Пока план пустой.
                <br>
                Открой цель и добавь подходящий шаг на сегодня.
            </div>
        `;

        return;
    }

    todayPlan.items.forEach((item) => {
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

            removeStepFromTodayPlan(item.goalId, item.partIndex);
        });

        checkbox.addEventListener("change", () => {
            fetch(apiUrl(`/goals/${item.goalId}/parts/${item.partIndex}`), {
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
                    alert("Не удалось обновить шаг в цели. Попробуй ещё раз 🌸");
                });
        });

        todayPlanList.appendChild(itemElement);
    });
}