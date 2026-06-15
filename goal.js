function renderRoutePoint(deadline) {
    const routePointCard = document.getElementById("routePointCard");
    const goalDeadline = document.getElementById("goalDeadline");
    const routePointStatus = document.getElementById("routePointStatus");

    const status = getRoutePointStatus(deadline, "Срок можно добавить позже");

    goalDeadline.innerText = formatRoutePointDate(deadline);
    routePointStatus.innerText = status.text;

    routePointCard.className = `route-point ${status.className}`;
}

const params = new URLSearchParams(window.location.search);

const goalId = params.get("id");

function copyGoalPart(part) {
    const payload = {
        title: part.title,
        deadline: part.deadline || null,
        type: part.type,
        unit: part.type === "MEASURABLE" ? part.unit : null,
        currentAmount: 0,
        targetAmount: part.type === "MEASURABLE" ? (part.targetAmount || 0) : 0
    };

    authFetch(`/goals/${goalId}/parts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (!response.ok) throw new Error("copy_failed");
            showFrogelToast("Шаг скопирован 🌿", "success");
            location.reload();
        })
        .catch(() => {
            showFrogelToast("Не удалось скопировать шаг. Попробуй ещё раз 🌸", "error");
        });
}

authFetch(`/goals/${goalId}`)
    .then(response => response.json())
    .then(goal => {
        document.getElementById("goalTitle").innerText =
            goal.title;

        renderRoutePoint(goal.deadline);

        let currentDeadline = goal.deadline;

        const editDeadlineButton =
            document.getElementById("editDeadlineButton");

        const editDeadlineModal =
            document.getElementById("editDeadlineModal");

        const editDeadlineInput =
            document.getElementById("editDeadlineInput");

        const cancelDeadlineButton =
            document.getElementById("cancelDeadlineButton");

        const saveDeadlineButton =
            document.getElementById("saveDeadlineButton");

        editDeadlineButton.addEventListener("click", () => {
            editDeadlineInput.value = currentDeadline || "";
            editDeadlineModal.classList.remove("hidden");
            editDeadlineInput.focus();
        });

        cancelDeadlineButton.addEventListener("click", () => {
            editDeadlineModal.classList.add("hidden");
        });

        editDeadlineModal.addEventListener("click", (event) => {
            if (event.target === editDeadlineModal) {
                editDeadlineModal.classList.add("hidden");
            }
        });

        saveDeadlineButton.addEventListener("click", () => {
            const newDeadline =
                editDeadlineInput.value === "" ? null : editDeadlineInput.value;

            saveDeadlineButton.disabled = true;
            saveDeadlineButton.innerText = "Сохраняем...";

            authFetch(`/goals/${goalId}/deadline`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    deadline: newDeadline
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Не удалось сохранить срок");
                    }

                    if (response.status === 204) {
                        return {
                            deadline: newDeadline
                        };
                    }

                    return response.json();
                })
                .then(updatedGoal => {
                    currentDeadline = updatedGoal.deadline;
                    renderRoutePoint(currentDeadline);
                    editDeadlineModal.classList.add("hidden");
                })
                .catch(() => {
                    showFrogelToast("Не удалось сохранить срок. Попробуй ещё раз 🌸", "error");
                })
                .finally(() => {
                    saveDeadlineButton.disabled = false;
                    saveDeadlineButton.innerText = "Сохранить";
                });
        });

        const planTodayButton =
            document.getElementById("planTodayButton");

        function renderComfortablePace(g) {
            const paceCard = document.getElementById("comfortablePaceCard");
            if (!paceCard) return;

            if (!g.deadline) {
                paceCard.classList.add("hidden");
                return;
            }

            const deadlineDate = parseDeadlineDate(g.deadline);
            if (!deadlineDate) {
                paceCard.classList.add("hidden");
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            deadlineDate.setHours(0, 0, 0, 0);
            const daysLeft = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

            if (daysLeft <= 0) {
                paceCard.classList.add("hidden");
                return;
            }

            const unitTotals = {};
            (g.parts || []).forEach(function(part) {
                if (part.completed || part.type !== "MEASURABLE") return;
                const remaining = (part.targetAmount || 0) - (part.currentAmount || 0);
                if (remaining <= 0) return;
                const unit = (part.unit || "").trim();
                if (!unit) return;
                unitTotals[unit] = (unitTotals[unit] || 0) + remaining;
            });

            const units = Object.keys(unitTotals);
            if (units.length === 0) {
                paceCard.classList.add("hidden");
                return;
            }

            const paceLines = document.getElementById("paceLines");
            paceLines.innerHTML = "";

            units.forEach(function(unit) {
                const totalRemaining = unitTotals[unit];
                const dailyAmount = Math.ceil(totalRemaining / daysLeft);
                const line = document.createElement("p");
                line.className = "comfortable-pace-line";
                line.textContent = "Около " + formatNumber(dailyAmount) + " " + unit + " в день";
                paceLines.appendChild(line);
            });

            paceCard.classList.remove("hidden");
        }

        function renderGoalDerived(g) {
            document.getElementById("goalProgress").innerText = g.progressPercent;
            document.getElementById("goalProgressFill").style.width = g.progressPercent + "%";

            const completedCount = g.parts.filter(p => p.completed).length;
            document.getElementById("goalPartsSummary").innerText =
                `${formatStepProgress(completedCount, g.parts.length)} цели завершено`;

            const next = g.parts.find(p => !p.completed);
            const nextStepText = document.getElementById("nextStepText");
            if (g.parts.length === 0) {
                nextStepText.classList.remove("next-step-clamped");
                nextStepText.innerHTML =
                    `<strong>Пока нет шагов</strong><br><br>Добавь первый шаг к этой цели.`;
                planTodayButton.style.display = "none";
            } else if (next) {
                nextStepText.classList.add("next-step-clamped");
                nextStepText.innerText = next.title;
                planTodayButton.style.display = "block";
            } else {
                nextStepText.classList.remove("next-step-clamped");
                nextStepText.innerHTML =
                    `<strong>Все шаги пройдены</strong><br><br>Можно добавить новый шаг, если цель продолжится.`;
                planTodayButton.style.display = "none";
            }

            renderComfortablePace(g);
        }

        renderGoalDerived(goal);

        planTodayButton.addEventListener("click", () => {
            const nextPartIndex =
                goal.parts.findIndex(part => !part.completed);

            if (nextPartIndex === -1) {
                showFrogelToast("У этой цели пока нет следующего шага 🌿", "info");
                return;
            }

            const step = {
                id: `${goal.id}-${nextPartIndex}`,
                goalId: goal.id,
                goalTitle: goal.title,
                partIndex: nextPartIndex,
                title: goal.parts[nextPartIndex].title,
                completed: false,
                createdAt: new Date().toISOString()
            };

            addStepToTodayPlan(step);
        });

        const goalPartsDiv = document.getElementById("goalParts");

        const goalPartsTitle =
            document.getElementById("goalPartsTitle");

        let stepSortMode = "added";

        function getSortedStepItems(parts, mode) {
            const items = parts.map((part, idx) => ({ part, originalIndex: idx }));
            if (mode === "deadline") {
                items.sort((a, b) => {
                    const da = a.part.deadline;
                    const db = b.part.deadline;
                    if (da && db) {
                        if (da < db) return -1;
                        if (da > db) return 1;
                        return a.originalIndex - b.originalIndex;
                    }
                    if (da) return -1;
                    if (db) return 1;
                    return a.originalIndex - b.originalIndex;
                });
            }
            return items;
        }

        function isMeasurablePart(part) {
            return part.type === "MEASURABLE";
        }

        function formatMeasuredPartText(part) {
            const currentAmount = part.currentAmount || 0;
            const targetAmount = part.targetAmount || 0;
            const unit = part.unit || "";

            return `${formatNumber(currentAmount)} из ${formatNumber(targetAmount)} ${unit}`.trim();
        }

        const addProgressModal =
            document.getElementById("addProgressModal");

        const closeProgressModalButton =
            document.getElementById("closeProgressModalButton");

        const progressAmountInput =
            document.getElementById("progressAmountInput");

        const addProgressSummary =
            document.getElementById("addProgressSummary");

        const saveProgressButton =
            document.getElementById("saveProgressButton");

        let selectedMeasuredPartIndex = null;
        let pendingDeleteStepAction = null;

        function clearProgressError() {
            const el = document.getElementById("progressAmountError");
            if (el) { el.textContent = ""; el.classList.add("hidden"); }
        }

        function closeAddProgressModal() {
            addProgressModal.classList.add("hidden");
            selectedMeasuredPartIndex = null;
            progressAmountInput.value = "";
            clearProgressError();
        }

        function openAddProgressModal(part, index) {
            selectedMeasuredPartIndex = index;

            addProgressSummary.innerText =
                `Сейчас: ${formatMeasuredPartText(part)}`;

            progressAmountInput.value = "";
            clearProgressError();
            addProgressModal.classList.remove("hidden");
            progressAmountInput.focus();
        }

        closeProgressModalButton.addEventListener("click", () => {
            closeAddProgressModal();
        });

        addProgressModal.addEventListener("click", (event) => {
            if (event.target === addProgressModal) {
                closeAddProgressModal();
            }
        });

        progressAmountInput.addEventListener("input", clearProgressError);

        saveProgressButton.addEventListener("click", () => {
            const valueStr = progressAmountInput.value.trim();
            const amountToAdd = Number(valueStr);

            if (valueStr === "") {
                showFieldError("progressAmountError", "Введите количество");
                progressAmountInput.focus();
                return;
            }

            if (amountToAdd <= 0) {
                showFieldError("progressAmountError", "Количество должно быть больше 0");
                progressAmountInput.focus();
                return;
            }

            if (selectedMeasuredPartIndex === null) {
                showFrogelToast("Не удалось определить шаг. Закрой окно и попробуй ещё раз 🌸", "error");
                return;
            }

            const selectedPart = goal.parts[selectedMeasuredPartIndex];

            if (!selectedPart) {
                showFrogelToast("Не удалось найти шаг. Обнови страницу и попробуй ещё раз 🌸", "error");
                return;
            }

            const currentAmount = selectedPart.currentAmount || 0;
            const targetAmount = selectedPart.targetAmount || 0;
            const remainingAmount = targetAmount - currentAmount;

            if (targetAmount > 0 && amountToAdd > remainingAmount) {
                showFieldError("progressAmountError", `Осталось добавить только ${formatNumber(remainingAmount)} ${selectedPart.unit || ""}`.trim());
                progressAmountInput.focus();
                return;
            }

            saveProgressButton.disabled = true;
            saveProgressButton.innerText = "Сохраняем...";

            authFetch(`/goals/${goalId}/parts/${selectedMeasuredPartIndex}/amount`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    amountToAdd: amountToAdd
                })
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error("Не удалось сохранить прогресс");
                    }

                    return response.json();
                })
                .then(() => {
                    closeAddProgressModal();
                    location.reload();
                })
                .catch(() => {
                    showFrogelToast("Не удалось добавить прогресс. Попробуй ещё раз 🌸", "error");
                })
                .finally(() => {
                    saveProgressButton.disabled = false;
                    saveProgressButton.innerText = "Добавить";
                });
        });

        function closeAllStepMenus() {
            document.querySelectorAll(".step-menu").forEach(function(m) {
                m.classList.add("hidden");
            });
            document.querySelectorAll(".sort-dropdown-menu").forEach(function(m) {
                m.classList.add("hidden");
            });
        }

        document.addEventListener("click", closeAllStepMenus);

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") { closeAllStepMenus(); }
        });

        function renderStepRows() {
            goalPartsDiv.innerHTML = "";
            if (goal.parts.length === 0) {
                goalPartsDiv.innerHTML = `
                    <div class="empty-state">
                        <p class="empty-state-title">У цели пока нет шагов</p>
                        <p class="empty-state-text">Добавь первый шаг, чтобы начать двигаться вперёд.</p>
                    </div>
                `;
                return;
            }
        getSortedStepItems(goal.parts, stepSortMode).forEach(({ part, originalIndex: index }) => {
        const partElement = document.createElement("div");
        partElement.className = "goal-part-row";

        const isMeasurable = isMeasurablePart(part);
        const measuredText = isMeasurable ? formatMeasuredPartText(part) : "";

        const deadlineInfo = part.deadline ? formatStepDeadlineLabel(part.deadline) : null;
        const deadlineHtml = deadlineInfo
            ? `<div class="goal-part-deadline-col goal-part-deadline--${deadlineInfo.modifier}">${deadlineInfo.label}</div>`
            : `<div class="goal-part-deadline-col"></div>`;

        partElement.innerHTML = `
            <div class="goal-part-left">
                <label class="goal-part-label">
                    <input
                        type="checkbox"
                        ${part.completed ? "checked" : ""}>

                    <span class="goal-part-text">
                        <span class="goal-part-title-clickable${part.completed ? " completed-part" : ""}">
                            ${part.title}
                        </span>

                        ${
                            isMeasurable && !part.completed
                                ? `<small class="goal-part-measured-text">${measuredText}</small>`
                                : ""
                        }
                    </span>
                </label>

                ${
                    isMeasurable && part.completed
                        ? `<div class="goal-part-details hidden">${measuredText}</div>`
                        : ""
                }
            </div>

            <div class="goal-part-right">
                ${deadlineHtml}

                <div class="goal-part-quick-action">
                    ${
                        isMeasurable && !part.completed
                            ? `<button
                                    type="button"
                                    class="goal-part-progress-button">
                                + Добавить
                            </button>`
                            : ""
                    }

                    ${
                        isMeasurable && part.completed
                            ? `<button
                                    type="button"
                                    class="goal-part-details-toggle"
                                    aria-label="Показать прогресс">
                                ⌄
                            </button>`
                            : ""
                    }
                </div>

                <div class="goal-part-menu"></div>
            </div>
        `;

        const checkbox = partElement.querySelector("input");

        const titleClickable = partElement.querySelector(".goal-part-title-clickable");
        if (titleClickable) {
            titleClickable.title = part.title;
            titleClickable.addEventListener("click", (e) => {
                e.preventDefault();
                document.getElementById("viewStepTitleText").textContent = part.title;
                document.getElementById("viewStepTitleModal").classList.remove("hidden");
            });
        }

        const menuWrapper = document.createElement("div");
        menuWrapper.className = "step-menu-wrapper";

        const menuTrigger = document.createElement("button");
        menuTrigger.type = "button";
        menuTrigger.className = "step-menu-trigger";
        menuTrigger.setAttribute("aria-label", "Действия с шагом");
        menuTrigger.innerText = "⋮";

        const menu = document.createElement("div");
        menu.className = "step-menu hidden";

        if (!part.completed) {
            const addToPlanMenuItem = document.createElement("button");
            addToPlanMenuItem.type = "button";
            addToPlanMenuItem.className = "step-menu-item";
            addToPlanMenuItem.innerText = "Добавить в план на сегодня";

            addToPlanMenuItem.addEventListener("click", (e) => {
                e.stopPropagation();
                closeAllStepMenus();
                addStepToTodayPlan({
                    id: `${goalId}-${index}`,
                    goalId: goalId,
                    goalTitle: goal.title,
                    partIndex: index,
                    title: part.title,
                    completed: false,
                    createdAt: new Date().toISOString()
                });
            });

            menu.appendChild(addToPlanMenuItem);
        }

        const copyMenuItem = document.createElement("button");
        copyMenuItem.type = "button";
        copyMenuItem.className = "step-menu-item";
        copyMenuItem.innerText = "Копировать";

        copyMenuItem.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllStepMenus();
            copyGoalPart(part);
        });

        const deleteMenuItem = document.createElement("button");
        deleteMenuItem.type = "button";
        deleteMenuItem.className = "step-menu-item step-menu-item--delete";
        deleteMenuItem.innerText = "Удалить";

        deleteMenuItem.addEventListener("click", () => {
            closeAllStepMenus();
            pendingDeleteStepAction = () => {
                authFetch(`/goals/${goalId}/parts/${index}`, {
                    method: "DELETE"
                })
                    .then(() => {
                        location.reload();
                    });
            };
            document.getElementById("deleteStepModal").classList.remove("hidden");
        });

        const editMenuItem = document.createElement("button");
        editMenuItem.type = "button";
        editMenuItem.className = "step-menu-item";
        editMenuItem.innerText = "Редактировать";

        editMenuItem.addEventListener("click", (e) => {
            e.stopPropagation();
            closeAllStepMenus();
            openEditPartModal(part, index);
        });

        menu.appendChild(copyMenuItem);
        menu.appendChild(editMenuItem);
        menu.appendChild(deleteMenuItem);
        menuWrapper.appendChild(menuTrigger);
        menuWrapper.appendChild(menu);

        menuTrigger.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = !menu.classList.contains("hidden");
            closeAllStepMenus();
            if (!isOpen) {
                menu.classList.remove("hidden");
            }
        });

const actionsContainer =
    partElement.querySelector(".goal-part-menu");

const progressButton =
    partElement.querySelector(".goal-part-progress-button");

if (progressButton) {
    progressButton.addEventListener("click", () => {
        openAddProgressModal(part, index);
    });
}

const detailsToggle =
    partElement.querySelector(".goal-part-details-toggle");

if (detailsToggle) {
    detailsToggle.addEventListener("click", () => {
        const details =
            partElement.querySelector(".goal-part-details");

        details.classList.toggle("hidden");

        detailsToggle.innerText =
            details.classList.contains("hidden") ? "⌄" : "⌃";
    });
}

            checkbox.addEventListener("change", () => {
                const wasChecked = checkbox.checked;
                authFetch(`/goals/${goalId}/parts/${index}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        completed: wasChecked
                    })
                })
                    .then(response => response.json())
                    .then(updatedGoal => {
                        Object.assign(goal, updatedGoal);
                        renderGoalDerived(goal);
                        renderStepRows();

                        const plan = loadTodayPlan();
                        plan.items = plan.items.map(function(planItem) {
                            if (String(planItem.goalId) === String(goalId) &&
                                Number(planItem.partIndex) === Number(index)) {
                                return Object.assign({}, planItem, { completed: wasChecked });
                            }
                            return planItem;
                        });
                        saveTodayPlan(plan);
                    });
            });

            actionsContainer.appendChild(menuWrapper);
            goalPartsDiv.appendChild(partElement);
        });
        }

        renderStepRows();

        const sortStepsButton = document.getElementById("sortStepsButton");
        const sortStepsMenu = document.getElementById("sortStepsMenu");

        if (sortStepsButton) {
            if (goal.parts.length === 0) {
                sortStepsButton.classList.add("hidden");
            }

            sortStepsButton.addEventListener("click", (e) => {
                e.stopPropagation();
                sortStepsMenu.classList.toggle("hidden");
            });

            sortStepsMenu.querySelectorAll(".sort-dropdown-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    e.stopPropagation();
                    stepSortMode = item.dataset.sort;
                    sortStepsMenu.querySelectorAll(".sort-dropdown-item").forEach(i => {
                        i.classList.remove("sort-dropdown-item--active");
                    });
                    item.classList.add("sort-dropdown-item--active");
                    sortStepsMenu.classList.add("hidden");
                    renderStepRows();
                });
            });
        }

        const modal =
            document.getElementById("addPartModal");

        const openModalButton =
            document.getElementById("openAddPartModalButton");

        const closePartModalButton =
            document.getElementById("closePartModalButton");

        const savePartButton =
            document.getElementById("savePartButton");

        const modalPartTitle =
            document.getElementById("modalPartTitle");

        const modalPartDeadline =
            document.getElementById("modalPartDeadline");

        let selectedPartType = "NORMAL";
        let stepModalMode = "create";
        let editingPartIndex = null;
        let initialStepModalState = null;

        const btnTypeNormal =
            document.getElementById("btnTypeNormal");

        const btnTypeMeasurable =
            document.getElementById("btnTypeMeasurable");

        const stepTypeHelper =
            document.getElementById("stepTypeHelper");

        const measurableStepFields =
            document.getElementById("measurableStepFields");

        const modalPartUnit =
            document.getElementById("modalPartUnit");

        const modalPartDone =
            document.getElementById("modalPartDone");

        const modalPartTotal =
            document.getElementById("modalPartTotal");

        function showFieldError(id, message) {
            const el = document.getElementById(id);
            if (el) {
                el.textContent = message;
                el.classList.remove("hidden");
            }
        }

        function clearPartErrors() {
            ["errorPartTitle", "errorPartDeadline", "errorPartUnit", "errorPartDone", "errorPartTotal"].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) { el.textContent = ""; el.classList.add("hidden"); }
            });
        }

        function setPartType(type) {
            selectedPartType = type;
            if (type === "MEASURABLE") {
                btnTypeNormal.classList.remove("step-type-btn--active");
                btnTypeMeasurable.classList.add("step-type-btn--active");
                measurableStepFields.classList.remove("hidden");
                stepTypeHelper.textContent = "Подходит для шагов, где прогресс считается количеством: страниц, рублей, упражнений.";
            } else {
                btnTypeMeasurable.classList.remove("step-type-btn--active");
                btnTypeNormal.classList.add("step-type-btn--active");
                measurableStepFields.classList.add("hidden");
                stepTypeHelper.textContent = "Подходит для шага, который можно просто отметить выполненным.";
            }
            clearPartErrors();
        }

        function closeAddPartModal() {
            modal.classList.add("hidden");
            initialStepModalState = null;
        }

        function resetAddPartModal() {
            stepModalMode = "create";
            editingPartIndex = null;
            document.getElementById("addPartModalTitle").textContent = "Новый шаг к цели";
            document.getElementById("addPartModalSubtitle").textContent = "Добавь маленький шаг, который поможет цели двигаться вперёд.";
            savePartButton.textContent = "Добавить";
            modalPartTitle.value = "";
            modalPartDeadline.value = "";
            modalPartUnit.value = "";
            modalPartDone.value = "0";
            modalPartTotal.value = "";
            setPartType("NORMAL");
            clearPartErrors();
            const counter = document.getElementById("stepTitleCounter");
            if (counter) {
                counter.textContent = "0/100";
                counter.classList.remove("step-title-counter--full");
            }
        }

        function getStepModalFormState() {
            return {
                title: modalPartTitle.value.trim(),
                deadline: modalPartDeadline.value || "",
                type: selectedPartType,
                unit: modalPartUnit.value.trim(),
                currentAmount: Number(modalPartDone.value) || 0,
                targetAmount: Number(modalPartTotal.value) || 0
            };
        }

        function captureStepModalInitialState() {
            initialStepModalState = getStepModalFormState();
        }

        function isStepModalDirty() {
            if (!initialStepModalState) return false;
            const s = getStepModalFormState();
            return (
                s.title !== initialStepModalState.title ||
                s.deadline !== initialStepModalState.deadline ||
                s.type !== initialStepModalState.type ||
                s.unit !== initialStepModalState.unit ||
                s.currentAmount !== initialStepModalState.currentAmount ||
                s.targetAmount !== initialStepModalState.targetAmount
            );
        }

        const discardStepModal = document.getElementById("discardStepModal");

        function tryCloseAddPartModal() {
            if (isStepModalDirty()) {
                discardStepModal.classList.remove("hidden");
            } else {
                closeAddPartModal();
            }
        }

        function openEditPartModal(part, index) {
            resetAddPartModal();
            stepModalMode = "edit";
            editingPartIndex = index;

            document.getElementById("addPartModalTitle").textContent = "Редактировать шаг";
            document.getElementById("addPartModalSubtitle").textContent = "Измени нужные поля и сохрани.";
            savePartButton.textContent = "Сохранить";

            modalPartTitle.value = part.title || "";
            modalPartDeadline.value = part.deadline || "";

            setPartType(part.type || "NORMAL");

            if (part.type === "MEASURABLE") {
                modalPartUnit.value = part.unit || "";
                modalPartDone.value = part.currentAmount !== undefined ? part.currentAmount : 0;
                modalPartTotal.value = part.targetAmount || "";
            }

            const counter = document.getElementById("stepTitleCounter");
            if (counter) {
                const len = modalPartTitle.value.length;
                counter.textContent = `${len}/100`;
                counter.classList.toggle("step-title-counter--full", len >= 100);
            }

            captureStepModalInitialState();
            modal.classList.remove("hidden");
            modalPartTitle.focus();
        }

        openModalButton.addEventListener("click", () => {
            resetAddPartModal();
            captureStepModalInitialState();
            modal.classList.remove("hidden");
            modalPartTitle.focus();
        });

        closePartModalButton.addEventListener("click", () => {
            tryCloseAddPartModal();
        });

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                tryCloseAddPartModal();
            }
        });

        document.getElementById("cancelDiscardStepButton").addEventListener("click", () => {
            discardStepModal.classList.add("hidden");
        });

        document.getElementById("confirmDiscardStepButton").addEventListener("click", () => {
            discardStepModal.classList.add("hidden");
            closeAddPartModal();
        });

        discardStepModal.addEventListener("click", (event) => {
            if (event.target === discardStepModal) {
                discardStepModal.classList.add("hidden");
            }
        });

        btnTypeNormal.addEventListener("click", () => setPartType("NORMAL"));
        btnTypeMeasurable.addEventListener("click", () => setPartType("MEASURABLE"));

        modalPartTitle.addEventListener("input", () => {
            document.getElementById("errorPartTitle").classList.add("hidden");
            const counter = document.getElementById("stepTitleCounter");
            if (counter) {
                const len = modalPartTitle.value.length;
                counter.textContent = `${len}/100`;
                counter.classList.toggle("step-title-counter--full", len >= 100);
            }
        });
        modalPartUnit.addEventListener("input", () => {
            document.getElementById("errorPartUnit").classList.add("hidden");
        });
        modalPartDone.addEventListener("input", () => {
            document.getElementById("errorPartDone").classList.add("hidden");
        });
        modalPartTotal.addEventListener("input", () => {
            document.getElementById("errorPartTotal").classList.add("hidden");
        });

        savePartButton.addEventListener("click", () => {
            clearPartErrors();
            let hasError = false;

            const title = modalPartTitle.value.trim();
            if (title === "") {
                showFieldError("errorPartTitle", "Введите название шага");
                modalPartTitle.focus();
                hasError = true;
            }

            if (selectedPartType === "MEASURABLE") {
                const unit = modalPartUnit.value.trim();
                const done = Number(modalPartDone.value);
                const totalStr = modalPartTotal.value.trim();
                const total = Number(totalStr);

                if (unit === "") {
                    showFieldError("errorPartUnit", "Укажите единицы измерения");
                    hasError = true;
                }

                if (totalStr === "" || total <= 0) {
                    showFieldError("errorPartTotal", "Укажите общий объём");
                    hasError = true;
                }

                if (done < 0) {
                    showFieldError("errorPartDone", "Значение не может быть меньше 0");
                    hasError = true;
                } else if (totalStr !== "" && total > 0 && done > total) {
                    showFieldError("errorPartDone", "Уже готово не может быть больше общего объёма");
                    hasError = true;
                }
            }

            if (hasError) return;

            const deadline =
                modalPartDeadline.value === "" ? null : modalPartDeadline.value;

            let partPayload = {
                title: title,
                deadline: deadline,
                type: "NORMAL",
                unit: null,
                currentAmount: 0,
                targetAmount: 0
            };

            if (selectedPartType === "MEASURABLE") {
                partPayload = {
                    title: title,
                    deadline: deadline,
                    type: "MEASURABLE",
                    unit: modalPartUnit.value.trim(),
                    currentAmount: Number(modalPartDone.value),
                    targetAmount: Number(modalPartTotal.value)
                };
            }

            if (stepModalMode === "edit") {
                savePartButton.disabled = true;
                savePartButton.innerText = "Сохраняем...";

                authFetch(`/goals/${goalId}/parts/${editingPartIndex}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(partPayload)
                })
                    .then(response => {
                        if (!response.ok) {
                            return response.json()
                                .catch(() => null)
                                .then(err => {
                                    if (err && err.error === "deadline_after_goal_deadline") {
                                        showFieldError("errorPartDeadline", "Срок шага не может быть позже срока цели");
                                    } else {
                                        showFrogelToast("Не удалось сохранить шаг. Попробуй ещё раз 🌸", "error");
                                    }
                                    throw new Error("update_failed");
                                });
                        }
                        return response.json();
                    })
                    .then(updatedGoal => {
                        Object.assign(goal, updatedGoal);
                        renderGoalDerived(goal);
                        renderStepRows();
                        closeAddPartModal();
                    })
                    .catch(() => {})
                    .finally(() => {
                        savePartButton.disabled = false;
                        savePartButton.innerText = "Сохранить";
                    });
            } else {
                authFetch(`/goals/${goalId}/parts`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(partPayload)
                })
                    .then(() => {
                        resetAddPartModal();
                        closeAddPartModal();
                        location.reload();
                    });
            }
        });

        // --- Series Generator ---

        const seriesGeneratorModal = document.getElementById("seriesGeneratorModal");
        const openSeriesGeneratorButton = document.getElementById("openSeriesGeneratorButton");
        const seriesTaskTitleInput = document.getElementById("seriesTaskTitle");
        const seriesTotalInput = document.getElementById("seriesTotal");
        const seriesUnitInput = document.getElementById("seriesUnit");
        const seriesCountInput = document.getElementById("seriesCount");
        const createSeriesButton = document.getElementById("createSeriesButton");
        const seriesPreviewEl = document.getElementById("seriesPreview");

        function clearSeriesErrors() {
            ["errorSeriesTaskTitle", "errorSeriesTotal", "errorSeriesUnit", "errorSeriesCount", "errorSeriesGeneral"].forEach(function(id) {
                const el = document.getElementById(id);
                if (el) { el.textContent = ""; el.classList.add("hidden"); }
            });
        }

        function updateSeriesPreview() {
            const total = Number(seriesTotalInput.value);
            const unit = seriesUnitInput.value.trim();
            const count = Number(seriesCountInput.value);

            if (!total || !count || total < 1 || count < 1 || count > total) {
                seriesPreviewEl.classList.add("hidden");
                return;
            }

            const base = Math.floor(total / count);
            const remainder = total % count;
            const stepWord = getRussianPluralForm(count, "шаг", "шага", "шагов");
            const unitPart = unit ? " " + unit : "";

            let previewText;
            if (remainder === 0) {
                previewText = "Будет создано " + count + " " + stepWord + " по " + base + unitPart + ".";
            } else {
                previewText = "Будет создано " + count + " " + stepWord + ": часть по " + (base + 1) + ", часть по " + base + unitPart + ".";
            }

            seriesPreviewEl.textContent = previewText;
            seriesPreviewEl.classList.remove("hidden");
        }

        function openSeriesGenerator() {
            seriesTaskTitleInput.value = modalPartTitle.value.trim();
            seriesTotalInput.value = "";
            seriesCountInput.value = "";
            seriesUnitInput.value = modalPartUnit.value.trim();
            clearSeriesErrors();
            seriesPreviewEl.classList.add("hidden");
            modal.classList.add("hidden");
            seriesGeneratorModal.classList.remove("hidden");
            seriesTotalInput.focus();
        }

        function closeSeriesGenerator() {
            seriesGeneratorModal.classList.add("hidden");
            modal.classList.remove("hidden");
        }

        openSeriesGeneratorButton.addEventListener("click", openSeriesGenerator);

        document.getElementById("closeSeriesGeneratorButton").addEventListener("click", closeSeriesGenerator);

        seriesGeneratorModal.addEventListener("click", function(e) {
            if (e.target === seriesGeneratorModal) {
                closeSeriesGenerator();
            }
        });

        [seriesTaskTitleInput, seriesTotalInput, seriesUnitInput, seriesCountInput].forEach(function(input) {
            input.addEventListener("input", function() {
                clearSeriesErrors();
                updateSeriesPreview();
            });
        });

        function generateSeriesStepTitle(taskTitle, from, to) {
            return taskTitle + " · " + formatNumber(from) + "–" + formatNumber(to);
        }

        createSeriesButton.addEventListener("click", async function() {
            clearSeriesErrors();
            let hasError = false;

            const taskTitle = seriesTaskTitleInput.value.trim();
            const totalStr = seriesTotalInput.value.trim();
            const unit = seriesUnitInput.value.trim();
            const countStr = seriesCountInput.value.trim();

            const total = Number(totalStr);
            const count = Number(countStr);

            if (taskTitle === "") {
                showFieldError("errorSeriesTaskTitle", "Введите название шага");
                hasError = true;
            }

            if (totalStr === "" || isNaN(total) || total < 1) {
                showFieldError("errorSeriesTotal", "Введите объём не менее 1");
                hasError = true;
            }

            if (unit === "") {
                showFieldError("errorSeriesUnit", "Введите единицу измерения");
                hasError = true;
            }

            if (countStr === "" || isNaN(count) || count < 1) {
                showFieldError("errorSeriesCount", "Введите количество шагов не менее 1");
                hasError = true;
            } else if (count > 100) {
                showFieldError("errorSeriesCount", "Пока можно создать до 100 шагов за раз.");
                hasError = true;
            } else if (!hasError && count > total) {
                showFieldError("errorSeriesCount", "Количество шагов не должно быть больше общего объёма.");
                hasError = true;
            }

            if (hasError) return;

            const base = Math.floor(total / count);
            const remainder = total % count;

            createSeriesButton.disabled = true;
            createSeriesButton.textContent = "Создаём...";

            try {
                let cursor = 1;
                for (let i = 0; i < count; i++) {
                    const amount = i < remainder ? base + 1 : base;
                    const from = cursor;
                    const to = cursor + amount - 1;
                    cursor = to + 1;

                    const title = generateSeriesStepTitle(taskTitle, from, to);

                    const payload = {
                        title: title,
                        deadline: null,
                        type: "MEASURABLE",
                        unit: unit,
                        currentAmount: 0,
                        targetAmount: amount
                    };

                    const response = await authFetch(`/goals/${goalId}/parts`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });

                    if (!response.ok) {
                        throw new Error("step_failed");
                    }
                }

                seriesGeneratorModal.classList.add("hidden");
                showFrogelToast("Шаги созданы", "success");
                location.reload();
            } catch (err) {
                showFieldError("errorSeriesGeneral", "Не удалось создать все шаги. Попробуй ещё раз.");
                createSeriesButton.disabled = false;
                createSeriesButton.textContent = "Создать шаги";
            }
        });

        // --- End Series Generator ---

        const deleteGoalButton =
            document.getElementById("deleteGoalButton");

        const deleteGoalModal =
            document.getElementById("deleteGoalModal");

        const cancelDeleteGoalButton =
            document.getElementById("cancelDeleteGoalButton");

        const confirmDeleteGoalButton =
            document.getElementById("confirmDeleteGoalButton");

        deleteGoalButton.addEventListener("click", () => {
            deleteGoalModal.classList.remove("hidden");
        });

        cancelDeleteGoalButton.addEventListener("click", () => {
            deleteGoalModal.classList.add("hidden");
        });

        deleteGoalModal.addEventListener("click", (event) => {
            if (event.target === deleteGoalModal) {
                deleteGoalModal.classList.add("hidden");
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                deleteGoalModal.classList.add("hidden");
            }
        });

        confirmDeleteGoalButton.addEventListener("click", () => {
            confirmDeleteGoalButton.disabled = true;
            confirmDeleteGoalButton.innerText = "Удаляем...";

            authFetch(`/goals/${goalId}`, {
                method: "DELETE"
            })
                .then(() => {
                    window.location.href = "/";
                })
                .catch(() => {
                    confirmDeleteGoalButton.disabled = false;
                    confirmDeleteGoalButton.innerText = "Удалить";
                    showFrogelToast("Не удалось удалить цель. Попробуй ещё раз 🌸", "error");
                });
        });

        const deleteStepModal =
            document.getElementById("deleteStepModal");

        const cancelDeleteStepButton =
            document.getElementById("cancelDeleteStepButton");

        const confirmDeleteStepButton =
            document.getElementById("confirmDeleteStepButton");

        cancelDeleteStepButton.addEventListener("click", () => {
            deleteStepModal.classList.add("hidden");
            pendingDeleteStepAction = null;
        });

        deleteStepModal.addEventListener("click", (event) => {
            if (event.target === deleteStepModal) {
                deleteStepModal.classList.add("hidden");
                pendingDeleteStepAction = null;
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                deleteStepModal.classList.add("hidden");
                pendingDeleteStepAction = null;
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                if (!discardStepModal.classList.contains("hidden")) {
                    discardStepModal.classList.add("hidden");
                } else if (!modal.classList.contains("hidden")) {
                    tryCloseAddPartModal();
                }
            }
        });

        confirmDeleteStepButton.addEventListener("click", () => {
            if (!pendingDeleteStepAction) return;
            confirmDeleteStepButton.disabled = true;
            confirmDeleteStepButton.innerText = "Удаляем...";
            const action = pendingDeleteStepAction;
            pendingDeleteStepAction = null;
            action();
        });

        const viewStepTitleModal = document.getElementById("viewStepTitleModal");

        document.getElementById("closeViewStepTitleModal").addEventListener("click", () => {
            viewStepTitleModal.classList.add("hidden");
        });

        viewStepTitleModal.addEventListener("click", (e) => {
            if (e.target === viewStepTitleModal) {
                viewStepTitleModal.classList.add("hidden");
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                viewStepTitleModal.classList.add("hidden");
            }
        });
    })
    .catch(err => {
        if (err.message === "Unauthorized" || err.message === "Missing auth token") return;
        console.error("[frogel] Failed to load goal:", err);
    });