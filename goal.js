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

fetch(apiUrl(`/goals/${goalId}`))
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

            fetch(apiUrl(`/goals/${goalId}/deadline`), {
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

        document.getElementById("goalProgress").innerText =
            goal.progressPercent;

        document.getElementById("goalProgressFill").style.width =
            goal.progressPercent + "%";

        const completedPartsCount =
            goal.parts.filter(part => part.completed).length;

        const totalPartsCount = goal.parts.length;

        document.getElementById("goalPartsSummary").innerText =
            `${formatStepProgress(completedPartsCount, totalPartsCount)} цели завершено`;

        const nextPart =
            goal.parts.find(part => !part.completed);

        const planTodayButton =
            document.getElementById("planTodayButton");

        if (goal.parts.length === 0) {

            document.getElementById("nextStepText").innerHTML =
                `<strong>Пока нет шагов</strong><br><br>Добавь первый шаг к этой цели.`;

            planTodayButton.style.display = "none";

        } else if (nextPart) {

            document.getElementById("nextStepText").innerText =
                nextPart.title;

            planTodayButton.style.display = "block";

        } else {

            document.getElementById("nextStepText").innerHTML =
                `<strong>Все шаги завершены</strong><br><br>Можно выдохнуть или добавить новый шаг, если цель продолжается.`;

            planTodayButton.style.display = "none";
        }

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

        if (goal.parts.length === 0) {
            goalPartsDiv.innerHTML = `
                <div class="empty-state">
                    <p class="empty-state-title">У цели пока нет шагов</p>
                    <p class="empty-state-text">Добавь первый шаг, чтобы начать двигаться вперёд.</p>
                </div>
            `;
        }

        function isMeasurablePart(part) {
            return part.type === "MEASURABLE";
        }

        function formatMeasuredPartText(part) {
            const currentAmount = part.currentAmount || 0;
            const targetAmount = part.targetAmount || 0;
            const unit = part.unit || "";

            return `${currentAmount} из ${targetAmount} ${unit}`.trim();
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
                showFieldError("progressAmountError", `Осталось добавить только ${remainingAmount} ${selectedPart.unit || ""}`.trim());
                progressAmountInput.focus();
                return;
            }

            saveProgressButton.disabled = true;
            saveProgressButton.innerText = "Сохраняем...";

            fetch(apiUrl(`/goals/${goalId}/parts/${selectedMeasuredPartIndex}/amount`), {
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
        }

        document.addEventListener("click", closeAllStepMenus);

        document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") { closeAllStepMenus(); }
        });

        if (goal.parts.length > 0) {
        goal.parts.forEach((part, index) => {
        const partElement = document.createElement("div");
        partElement.className = "goal-part-row";

        const isMeasurable = isMeasurablePart(part);
        const measuredText = isMeasurable ? formatMeasuredPartText(part) : "";

        partElement.innerHTML = `
            <div class="goal-part-left">
                <label class="goal-part-label">
                    <input
                        type="checkbox"
                        ${part.completed ? "checked" : ""}>

                    <span class="goal-part-text">
                        <span class="${part.completed ? "completed-part" : ""}">
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

            <div class="goal-part-actions">
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
        `;

        const checkbox = partElement.querySelector("input");

        const menuWrapper = document.createElement("div");
        menuWrapper.className = "step-menu-wrapper";

        const menuTrigger = document.createElement("button");
        menuTrigger.type = "button";
        menuTrigger.className = "step-menu-trigger";
        menuTrigger.setAttribute("aria-label", "Действия с шагом");
        menuTrigger.innerText = "⋮";

        const menu = document.createElement("div");
        menu.className = "step-menu hidden";

        const deleteMenuItem = document.createElement("button");
        deleteMenuItem.type = "button";
        deleteMenuItem.className = "step-menu-item step-menu-item--delete";
        deleteMenuItem.innerText = "Удалить";

        deleteMenuItem.addEventListener("click", () => {
            closeAllStepMenus();
            pendingDeleteStepAction = () => {
                fetch(apiUrl(`/goals/${goalId}/parts/${index}`), {
                    method: "DELETE"
                })
                    .then(() => {
                        location.reload();
                    });
            };
            document.getElementById("deleteStepModal").classList.remove("hidden");
        });

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
    partElement.querySelector(".goal-part-actions");

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
                fetch(apiUrl(`/goals/${goalId}/parts/${index}`), {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        completed: checkbox.checked
                    })
                })
                    .then(response => response.json())
                    .then(updatedGoal => {
                        document.getElementById("goalProgress").innerText =
                            updatedGoal.progressPercent;

                        document.getElementById("goalProgressFill").style.width =
                            updatedGoal.progressPercent + "%";

                        const completedPartsCount =
                            updatedGoal.parts.filter(part => part.completed).length;

                        const totalPartsCount = updatedGoal.parts.length;

                        document.getElementById("goalPartsSummary").innerText =
                            `${formatStepProgress(completedPartsCount, totalPartsCount)} цели завершено`;

                        const nextPart =
                            updatedGoal.parts.find(part => !part.completed);

                        if (nextPart) {

                            document.getElementById("nextStepText").innerText =
                                nextPart.title;

                            planTodayButton.style.display = "block";

                        } else {

                            document.getElementById("nextStepText").innerHTML =
                                `<strong>Все шаги завершены</strong><br><br>Можно выдохнуть или добавить новый шаг, если цель продолжается.`;

                            planTodayButton.style.display = "none";
                        }

                         const partTitle = partElement.querySelector(".goal-part-text > span");

                         if (checkbox.checked) {
                             partTitle.classList.add("completed-part");
                         } else {
                             partTitle.classList.remove("completed-part");
                         }

                         const plan = loadTodayPlan();
                         plan.items = plan.items.map(function(planItem) {
                             if (String(planItem.goalId) === String(goalId) &&
                                 Number(planItem.partIndex) === Number(index)) {
                                 return Object.assign({}, planItem, { completed: checkbox.checked });
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
            ["errorPartTitle", "errorPartUnit", "errorPartDone", "errorPartTotal"].forEach(function(id) {
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
        }

        function resetAddPartModal() {
            modalPartTitle.value = "";
            modalPartDeadline.value = "";
            modalPartUnit.value = "";
            modalPartDone.value = "0";
            modalPartTotal.value = "";
            setPartType("NORMAL");
            clearPartErrors();
        }

        openModalButton.addEventListener("click", () => {
            resetAddPartModal();
            modal.classList.remove("hidden");
            modalPartTitle.focus();
        });

        closePartModalButton.addEventListener("click", () => {
            closeAddPartModal();
        });

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                closeAddPartModal();
            }
        });

        btnTypeNormal.addEventListener("click", () => setPartType("NORMAL"));
        btnTypeMeasurable.addEventListener("click", () => setPartType("MEASURABLE"));

        modalPartTitle.addEventListener("input", () => {
            document.getElementById("errorPartTitle").classList.add("hidden");
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

            fetch(apiUrl(`/goals/${goalId}/parts`), {
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
        });

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

            fetch(apiUrl(`/goals/${goalId}`), {
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

        confirmDeleteStepButton.addEventListener("click", () => {
            if (!pendingDeleteStepAction) return;
            confirmDeleteStepButton.disabled = true;
            confirmDeleteStepButton.innerText = "Удаляем...";
            const action = pendingDeleteStepAction;
            pendingDeleteStepAction = null;
            action();
        });
    });