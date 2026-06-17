let pendingDeleteAction = null;

function renderGoal(goal) {
    const goalsDiv = document.getElementById("goals");

    const existingEmpty = goalsDiv.querySelector(".empty-state");
    if (existingEmpty) existingEmpty.remove();

    const goalElement = document.createElement("div");
    goalElement.className = "goal-card goal-card-clickable";
    goalElement.tabIndex = 0;
    goalElement.setAttribute("role", "link");

    const parts = goal.parts || [];
    const totalPartsCount = parts.length;
    const completedPartsCount = parts.filter(part => part.completed).length;

    const routePointStatus = getRoutePointStatus(goal.deadline);
    const deadlineDotClass = routePointStatus.className.replace("route-point-", "deadline-dot-");

    const stepsText =
        totalPartsCount === 0
            ? "Пока без шагов"
            : formatStepCount(totalPartsCount);

    const stepProgressHtml = totalPartsCount === 0
        ? "Пока без шагов"
        : `<strong class="goal-row-count-done">${completedPartsCount}</strong> из ${totalPartsCount} ${getRussianPluralForm(totalPartsCount, "шага", "шагов", "шагов")}`;

    goalElement.innerHTML = `
        <div class="goal-card-main">
            <div>
                <h3>${goal.title}</h3>
                <p class="goal-meta">${stepsText}</p>
            </div>
        </div>

        <div class="goal-row-bar-cell">
            <div class="goal-row-mini-bar">
                <div class="goal-row-mini-fill" style="width: ${goal.progressPercent}%"></div>
            </div>
        </div>

        <div class="goal-row-count-block">
            <span class="goal-row-count">${stepProgressHtml}</span>
            <span class="goal-row-percent">${goal.progressPercent}%</span>
        </div>

        <div class="goal-card-route-point">
            <span class="deadline-status-dot ${deadlineDotClass}"></span>
            <strong>${formatShortGoalDate(goal.deadline)}</strong>
        </div>

        <div class="goal-card-actions">
            <div class="step-menu-wrapper">
                <button class="step-menu-trigger goal-menu-trigger" type="button" aria-label="Действия с целью">⋮</button>
                <div class="step-menu hidden">
                    <button class="step-menu-item goal-menu-open" type="button">Открыть</button>
                    <button class="step-menu-item step-menu-item--delete goal-menu-delete" type="button">Удалить</button>
                </div>
            </div>
        </div>
    `;

    const menuTrigger = goalElement.querySelector(".goal-menu-trigger");
    const goalMenu = goalElement.querySelector(".step-menu");
    const menuOpenBtn = goalElement.querySelector(".goal-menu-open");
    const menuDeleteBtn = goalElement.querySelector(".goal-menu-delete");

    menuTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const isOpen = !goalMenu.classList.contains("hidden");
        document.querySelectorAll(".step-menu:not(.hidden)").forEach(m => m.classList.add("hidden"));
        if (!isOpen) goalMenu.classList.remove("hidden");
    });

    menuOpenBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        window.location.href = `goal.html?id=${goal.id}`;
    });

    menuDeleteBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        goalMenu.classList.add("hidden");

        pendingDeleteAction = () => authFetch(`/goals/${goal.id}`, {
                method: "DELETE"
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Не удалось удалить цель");
                }
                removeTodayPlanItemsByGoalId(goal.id);
                goalElement.remove();
                if (goalsDiv.children.length === 0) {
                    goalsDiv.innerHTML = `
                        <div class="empty-state">
                            <p class="empty-state-title">Пока здесь тихо</p>
                            <p class="empty-state-text">Добавь первую цель — она появится в этом блоке.</p>
                        </div>
                    `;
                }
                renderTodayPlan();
                renderDayResults();
            })
            .catch(() => {
                showFrogelToast("Не удалось удалить цель. Попробуй ещё раз 🌸", "error");
            });

        deleteGoalModal.classList.remove("hidden");
    });

    goalElement.addEventListener("click", () => {
        window.location.href = `goal.html?id=${goal.id}`;
    });

    goalElement.addEventListener("keydown", (event) => {
        if (event.target.closest("button")) {
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            window.location.href = `goal.html?id=${goal.id}`;
        }
    });

    goalsDiv.appendChild(goalElement);

    const titleEl = goalElement.querySelector("h3");
    if (titleEl && titleEl.scrollWidth > titleEl.clientWidth) {
        const fullTitle = goal.title;
        titleEl.classList.add("goal-title--expandable");
        titleEl.tabIndex = 0;
        titleEl.setAttribute("aria-label", "Показать полное название");
        titleEl.addEventListener("click", (e) => {
            e.stopPropagation();
            document.getElementById("goalTitlePopupText").textContent = fullTitle;
            document.getElementById("goalTitlePopup").classList.remove("hidden");
        });
        titleEl.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                e.preventDefault();
                document.getElementById("goalTitlePopupText").textContent = fullTitle;
                document.getElementById("goalTitlePopup").classList.remove("hidden");
            }
        });
    }
}

async function loadGoals() {
    try {
        const response = await authFetch("/goals");
        const data = await response.json();

        if (!Array.isArray(data)) {
            console.error("[frogel] Expected /goals to return array, got:", data);
            showFrogelToast("Не удалось загрузить цели. Попробуй обновить страницу 🌸", "error");
            return;
        }

        syncTodayPlanWithGoals(data);
        renderTodayPlan();
        renderAttentionBlock(data);

        data.forEach(goal => {
            renderGoal(goal);
        });

        if (data.length === 0) {
            const goalsDiv = document.getElementById("goals");
            goalsDiv.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-title">Пока здесь тихо</p>
                    <p class="empty-state-text">Добавь первую цель — она появится в этом блоке.</p>
                </div>
            `;
        }
    } catch (err) {
        if (err.message === "Unauthorized" || err.message === "Missing auth token") return;
        console.error("[frogel] loadGoals error:", err);
        const goalsDiv = document.getElementById("goals");
        goalsDiv.innerHTML = `
            <div class="goals-backend-error">
                <p class="goals-backend-error-title">Не получилось загрузить цели</p>
                <p class="goals-backend-error-text">Frogel не смог связаться с сервером. Попробуй обновить страницу.</p>
                <button class="goals-backend-error-button" type="button" onclick="window.location.reload()">Обновить</button>
            </div>
        `;
    }
}

// =================== NEW GOAL MODAL ===================

function createNgStepBlock(removable) {
    const block = document.createElement("div");
    block.className = "new-goal-step-block";
    block.dataset.stepType = "NORMAL";

    block.innerHTML = `
        <div class="new-goal-step-header">
            <span class="new-goal-step-number"></span>
            ${removable ? "<button type=\"button\" class=\"new-goal-step-remove\" aria-label=\"Удалить шаг\">×</button>" : ""}
        </div>
        <div class="add-step-field">
            <div class="add-step-label-row">
                <label>Название шага</label>
                <span class="step-title-counter ng-step-title-counter">0/100</span>
            </div>
            <input type="text" class="ng-step-title" placeholder="Например: изучить основы" maxlength="100">
            <span class="field-error hidden ng-step-title-error"></span>
        </div>
        <div class="add-step-field">
            <label>Срок шага</label>
            <input type="date" class="ng-step-deadline add-step-date-input">
        </div>
        <div class="add-step-field">
            <label>Вид шага</label>
            <div class="step-type-toggle">
                <button type="button" class="step-type-btn step-type-btn--active ng-btn-normal">Обычный шаг</button>
                <button type="button" class="step-type-btn ng-btn-measurable">Измеряемый шаг</button>
            </div>
            <p class="step-type-helper ng-type-helper">Подходит для шага, который можно просто отметить выполненным.</p>
        </div>
        <div class="measurable-fields hidden ng-measurable-fields">
            <div class="add-step-field">
                <div class="add-step-label-row">
                    <label>Единицы</label>
                    <button type="button" class="field-help-button" title="Напиши слово так, как оно звучит после числа: страниц, рублей, упражнений.">!</button>
                </div>
                <input type="text" class="ng-step-unit" placeholder="Например: страниц">
                <span class="field-error hidden ng-step-unit-error"></span>
            </div>
            <div class="add-step-grid">
                <div class="add-step-field">
                    <label>Уже готово</label>
                    <input type="number" class="ng-step-done" min="0" value="0">
                    <span class="field-error hidden ng-step-done-error"></span>
                </div>
                <div class="add-step-field">
                    <label>Всего</label>
                    <input type="number" class="ng-step-total" min="1" placeholder="100">
                    <span class="field-error hidden ng-step-total-error"></span>
                </div>
            </div>
        </div>
    `;

    const btnNormal = block.querySelector(".ng-btn-normal");
    const btnMeasurable = block.querySelector(".ng-btn-measurable");
    const typeHelper = block.querySelector(".ng-type-helper");
    const measurableFields = block.querySelector(".ng-measurable-fields");

    btnNormal.addEventListener("click", () => {
        block.dataset.stepType = "NORMAL";
        btnNormal.classList.add("step-type-btn--active");
        btnMeasurable.classList.remove("step-type-btn--active");
        measurableFields.classList.add("hidden");
        typeHelper.textContent = "Подходит для шага, который можно просто отметить выполненным.";
    });

    btnMeasurable.addEventListener("click", () => {
        block.dataset.stepType = "MEASURABLE";
        btnMeasurable.classList.add("step-type-btn--active");
        btnNormal.classList.remove("step-type-btn--active");
        measurableFields.classList.remove("hidden");
        typeHelper.textContent = "Подходит для шагов, где прогресс считается количеством: страниц, рублей, упражнений.";
    });

    if (removable) {
        block.querySelector(".new-goal-step-remove").addEventListener("click", () => {
            block.remove();
            updateNgStepNumbers();
        });
    }

    block.querySelector(".ng-step-title").addEventListener("input", () => {
        block.querySelector(".ng-step-title-error").classList.add("hidden");
        const len = block.querySelector(".ng-step-title").value.length;
        const counter = block.querySelector(".ng-step-title-counter");
        if (counter) {
            counter.textContent = `${len}/100`;
            counter.classList.toggle("step-title-counter--full", len >= 100);
        }
    });
    block.querySelector(".ng-step-unit").addEventListener("input", () => {
        block.querySelector(".ng-step-unit-error").classList.add("hidden");
    });
    block.querySelector(".ng-step-done").addEventListener("input", () => {
        block.querySelector(".ng-step-done-error").classList.add("hidden");
    });
    block.querySelector(".ng-step-total").addEventListener("input", () => {
        block.querySelector(".ng-step-total-error").classList.add("hidden");
    });

    return block;
}

function updateNgStepNumbers() {
    document.querySelectorAll("#newGoalStepsContainer .new-goal-step-block").forEach((block, idx) => {
        block.querySelector(".new-goal-step-number").textContent = "Шаг " + (idx + 1);
    });
}

function addNgStepBlock() {
    const container = document.getElementById("newGoalStepsContainer");
    const isFirst = container.querySelectorAll(".new-goal-step-block").length === 0;
    const block = createNgStepBlock(!isFirst);
    container.appendChild(block);
    updateNgStepNumbers();
}

function resetNewGoalModal() {
    document.getElementById("newGoalTitle").value = "";
    document.getElementById("newGoalDeadline").value = "";
    document.getElementById("newGoalDescription").value = "";

    const errTitle = document.getElementById("errorNewGoalTitle");
    errTitle.textContent = "";
    errTitle.classList.add("hidden");

    document.getElementById("newGoalStepsContainer").innerHTML = "";
    addNgStepBlock();
}

function openNewGoalModal() {
    resetNewGoalModal();
    document.getElementById("newGoalModal").classList.remove("hidden");
    document.getElementById("newGoalTitle").focus();
}

function closeNewGoalModal() {
    document.getElementById("newGoalModal").classList.add("hidden");
}

function validateAndSubmitNewGoal() {
    let hasError = false;
    let firstErrorEl = null;

    const goalTitle = document.getElementById("newGoalTitle").value.trim();
    if (goalTitle === "") {
        const err = document.getElementById("errorNewGoalTitle");
        err.textContent = "Введите название цели";
        err.classList.remove("hidden");
        firstErrorEl = document.getElementById("newGoalTitle");
        hasError = true;
    }

    const stepBlocks = document.querySelectorAll("#newGoalStepsContainer .new-goal-step-block");
    const stepsPayload = [];

    stepBlocks.forEach((block) => {
        const titleInput = block.querySelector(".ng-step-title");
        const stepTitle = titleInput.value.trim();
        const stepType = block.dataset.stepType;
        const titleError = block.querySelector(".ng-step-title-error");

        if (stepTitle === "") {
            titleError.textContent = "Введите название шага";
            titleError.classList.remove("hidden");
            if (!firstErrorEl) firstErrorEl = titleInput;
            hasError = true;
        }

        if (stepType === "MEASURABLE") {
            const unitInput = block.querySelector(".ng-step-unit");
            const doneInput = block.querySelector(".ng-step-done");
            const totalInput = block.querySelector(".ng-step-total");
            const unitErr = block.querySelector(".ng-step-unit-error");
            const doneErr = block.querySelector(".ng-step-done-error");
            const totalErr = block.querySelector(".ng-step-total-error");

            const unit = unitInput.value.trim();
            const done = Number(doneInput.value);
            const totalStr = totalInput.value.trim();
            const total = Number(totalStr);

            if (unit === "") {
                unitErr.textContent = "Укажите единицы измерения";
                unitErr.classList.remove("hidden");
                if (!firstErrorEl) firstErrorEl = unitInput;
                hasError = true;
            }
            if (totalStr === "" || total <= 0) {
                totalErr.textContent = "Укажите общий объём";
                totalErr.classList.remove("hidden");
                if (!firstErrorEl) firstErrorEl = totalInput;
                hasError = true;
            }
            if (done < 0) {
                doneErr.textContent = "Значение не может быть меньше 0";
                doneErr.classList.remove("hidden");
                if (!firstErrorEl) firstErrorEl = doneInput;
                hasError = true;
            } else if (totalStr !== "" && total > 0 && done > total) {
                doneErr.textContent = "Уже готово не может быть больше общего объёма";
                doneErr.classList.remove("hidden");
                if (!firstErrorEl) firstErrorEl = doneInput;
                hasError = true;
            }

            stepsPayload.push({
                title: stepTitle,
                deadline: block.querySelector(".ng-step-deadline").value || null,
                type: "MEASURABLE",
                unit: unit,
                currentAmount: done,
                targetAmount: total
            });
        } else {
            stepsPayload.push({
                title: stepTitle,
                deadline: block.querySelector(".ng-step-deadline").value || null,
                type: "NORMAL",
                unit: null,
                currentAmount: 0,
                targetAmount: 0
            });
        }
    });

    if (firstErrorEl) firstErrorEl.focus();
    if (hasError) return;

    const submitBtn = document.getElementById("submitNewGoalButton");
    submitBtn.disabled = true;
    submitBtn.innerText = "Сохраняем...";

    const goalDeadline = document.getElementById("newGoalDeadline").value || null;
    const goalDescription = document.getElementById("newGoalDescription").value.trim() || null;

    authFetch("/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: goalTitle, description: goalDescription, deadline: goalDeadline })
    })
    .then((res) => {
        if (!res.ok) throw new Error("goal_create_failed");
        return res.json();
    })
    .then((newGoal) => {
        const stepFetches = stepsPayload.map((step) =>
            authFetch("/goals/" + newGoal.id + "/parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(step)
            }).then((r) => {
                if (!r.ok) throw new Error("step_failed");
            })
        );
        return Promise.allSettled(stepFetches).then((results) => ({ results }));
    })
    .then(({ results }) => {
        const failed = results.filter((r) => r.status === "rejected").length;
        closeNewGoalModal();
        document.getElementById("goals").innerHTML = "";
        loadGoals();
        if (failed > 0) {
            showFrogelToast(
                "Цель создана, но " + failed + " " + getRussianPluralForm(failed, "шаг", "шага", "шагов") + " не добавился. Открой цель и добавь вручную. 🌸",
                "warning"
            );
        }
    })
    .catch((err) => {
        if (err && err.message === "Unauthorized") return;
        showFrogelToast("Не удалось создать цель. Попробуй ещё раз 🌸", "error");
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.innerText = "Добавить";
    });
}

function isNewGoalModalDirty() {
    if (document.getElementById("newGoalTitle").value.trim()) return true;
    if (document.getElementById("newGoalDeadline").value) return true;
    if (document.getElementById("newGoalDescription").value.trim()) return true;
    const stepInputs = document.querySelectorAll("#newGoalStepsContainer .ng-step-title");
    for (let i = 0; i < stepInputs.length; i++) {
        if (stepInputs[i].value.trim()) return true;
    }
    return false;
}

function tryCloseNewGoalModal() {
    if (isNewGoalModalDirty()) {
        document.getElementById("discardNewGoalModal").classList.remove("hidden");
    } else {
        closeNewGoalModal();
    }
}

document.getElementById("openNewGoalModal").addEventListener("click", openNewGoalModal);
document.getElementById("closeNewGoalModal").addEventListener("click", closeNewGoalModal);
document.getElementById("newGoalModal").addEventListener("click", (event) => {
    if (event.target === document.getElementById("newGoalModal")) tryCloseNewGoalModal();
});
document.getElementById("addStepBlockButton").addEventListener("click", addNgStepBlock);
document.getElementById("submitNewGoalButton").addEventListener("click", validateAndSubmitNewGoal);
document.getElementById("newGoalTitle").addEventListener("input", () => {
    document.getElementById("errorNewGoalTitle").classList.add("hidden");
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        const discardNgModal = document.getElementById("discardNewGoalModal");
        if (discardNgModal && !discardNgModal.classList.contains("hidden")) {
            discardNgModal.classList.add("hidden");
            return;
        }
        const ngModal = document.getElementById("newGoalModal");
        if (ngModal && !ngModal.classList.contains("hidden")) {
            tryCloseNewGoalModal();
        }
    }
});

const discardNewGoalModal = document.getElementById("discardNewGoalModal");
document.getElementById("cancelDiscardNewGoalButton").addEventListener("click", () => {
    discardNewGoalModal.classList.add("hidden");
});
document.getElementById("confirmDiscardNewGoalButton").addEventListener("click", () => {
    discardNewGoalModal.classList.add("hidden");
    closeNewGoalModal();
});
discardNewGoalModal.addEventListener("click", (event) => {
    if (event.target === discardNewGoalModal) discardNewGoalModal.classList.add("hidden");
});

const dayResultsButton =
    document.getElementById("dayResultsButton");

const dayResultsModal =
    document.getElementById("dayResultsModal");

const closeDayResultsButton =
    document.getElementById("closeDayResultsButton");

if (dayResultsButton && dayResultsModal && closeDayResultsButton) {
    dayResultsButton.addEventListener("click", () => {
        renderDayResults();
        dayResultsModal.classList.remove("hidden");
    });

    closeDayResultsButton.addEventListener("click", () => {
        dayResultsModal.classList.add("hidden");
    });

    dayResultsModal.addEventListener("click", (event) => {
        if (event.target === dayResultsModal) {
            dayResultsModal.classList.add("hidden");
        }
    });
}

const deleteGoalModal = document.getElementById("deleteGoalModal");
const cancelDeleteGoalButton = document.getElementById("cancelDeleteGoalButton");
const confirmDeleteGoalButton = document.getElementById("confirmDeleteGoalButton");

if (deleteGoalModal && cancelDeleteGoalButton && confirmDeleteGoalButton) {
    cancelDeleteGoalButton.addEventListener("click", () => {
        deleteGoalModal.classList.add("hidden");
        pendingDeleteAction = null;
    });

    deleteGoalModal.addEventListener("click", (event) => {
        if (event.target === deleteGoalModal) {
            deleteGoalModal.classList.add("hidden");
            pendingDeleteAction = null;
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            deleteGoalModal.classList.add("hidden");
            pendingDeleteAction = null;
        }
    });

    confirmDeleteGoalButton.addEventListener("click", () => {
        if (!pendingDeleteAction) return;
        confirmDeleteGoalButton.disabled = true;
        confirmDeleteGoalButton.innerText = "Удаляем...";
        pendingDeleteAction().finally(() => {
            confirmDeleteGoalButton.disabled = false;
            confirmDeleteGoalButton.innerText = "Удалить";
            deleteGoalModal.classList.add("hidden");
            pendingDeleteAction = null;
        });
    });
}

loadGoals();

const logoutButton = document.getElementById("logoutButton");
const logoutConfirmModal = document.getElementById("logoutConfirmModal");
const cancelLogoutButton = document.getElementById("cancelLogoutButton");
const confirmLogoutButton = document.getElementById("confirmLogoutButton");

if (logoutButton) {
    logoutButton.addEventListener("click", () => {
        logoutConfirmModal.classList.remove("hidden");
    });
}

if (cancelLogoutButton) {
    cancelLogoutButton.addEventListener("click", () => {
        logoutConfirmModal.classList.add("hidden");
    });
}

if (confirmLogoutButton) {
    confirmLogoutButton.addEventListener("click", () => {
        clearAuthToken();
        window.location.replace("/auth.html");
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".step-menu:not(.hidden)").forEach(m => m.classList.add("hidden"));
});

const goalTitlePopup = document.getElementById("goalTitlePopup");
const closeGoalTitlePopupBtn = document.getElementById("closeGoalTitlePopup");

if (goalTitlePopup && closeGoalTitlePopupBtn) {
    closeGoalTitlePopupBtn.addEventListener("click", () => {
        goalTitlePopup.classList.add("hidden");
    });
    goalTitlePopup.addEventListener("click", (e) => {
        if (e.target === goalTitlePopup) {
            goalTitlePopup.classList.add("hidden");
        }
    });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            goalTitlePopup.classList.add("hidden");
        }
    });
}