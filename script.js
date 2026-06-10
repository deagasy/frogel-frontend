let pendingDeleteAction = null;

function renderGoal(goal) {
    const goalsDiv = document.getElementById("goals");

    const goalElement = document.createElement("div");
    goalElement.className = "goal-card goal-card-clickable";
    goalElement.tabIndex = 0;
    goalElement.setAttribute("role", "link");

    const parts = goal.parts || [];
    const totalPartsCount = parts.length;
    const completedPartsCount = parts.filter(part => part.completed).length;

    const routePointStatus = getRoutePointStatus(goal.deadline);
    const routePointDate = formatRoutePointDate(goal.deadline);
    const deadlineDotClass = routePointStatus.className.replace("route-point-", "deadline-dot-");

    const stepsText =
        totalPartsCount === 0
            ? "Пока без шагов"
            : formatStepCount(totalPartsCount);

goalElement.innerHTML = `
    <div class="goal-card-main">
        <div>
            <h3>${goal.title}</h3>
            <p class="goal-meta">${stepsText}</p>
        </div>
    </div>

        <div class="goal-card-progress-summary">
            <span>${formatStepProgress(completedPartsCount, totalPartsCount)}</span>
            <strong>${goal.progressPercent}%</strong>
        </div>

        <div class="goal-card-route-point">
            <span class="deadline-status-dot ${deadlineDotClass}"></span>

            <div>
                <span class="goal-card-route-label">Срок цели</span>
                <strong>${routePointDate}</strong>
            </div>
        </div>

        <div class="goal-card-actions">
            <button class="delete-button">Удалить</button>
        </div>
    `;

    const deleteButton = goalElement.querySelector(".delete-button");

    deleteButton.addEventListener("click", (event) => {
        event.stopPropagation();

        pendingDeleteAction = () => fetch(apiUrl(`/goals/${goal.id}`), {
                method: "DELETE"
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error("Не удалось удалить цель");
                }
                removeTodayPlanItemsByGoalId(goal.id);
                goalElement.remove();
                renderTodayPlan();
                renderDayResults();
            })
            .catch(() => {
                alert("Не удалось удалить цель. Попробуй ещё раз 🌸");
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
}

function loadGoals() {
    fetch(apiUrl("/goals"))
        .then(response => response.json())
        .then(goals => {
            syncTodayPlanWithGoals(goals);
            renderTodayPlan();
            renderAttentionBlock(goals);

            goals.forEach(goal => {
                renderGoal(goal);
            });
        });
}

function createGoal() {
    const titleInput = document.getElementById("titleInput");
    const deadlineInput = document.getElementById("deadlineInput");
    const goalTitleError = document.getElementById("goalTitleError");

    const title = titleInput.value;
    const deadline = deadlineInput.value;

    if (title.trim() === "") {
        goalTitleError.classList.remove("hidden");
        titleInput.focus();
        return;
    }

    goalTitleError.classList.add("hidden");

    fetch(apiUrl("/goals"), {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title: title,
            deadline: deadline === "" ? null : deadline
        })
    })
        .then(response => response.json())
        .then(newGoal => {
            renderGoal(newGoal);

            titleInput.value = "";
            deadlineInput.value = "";
        });
}

const addGoalButton = document.getElementById("addGoalButton");

addGoalButton.addEventListener("click", () => {
    createGoal();
});

document.getElementById("titleInput").addEventListener("input", () => {
    document.getElementById("goalTitleError").classList.add("hidden");
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