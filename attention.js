const ATTENTION_SOON_DAYS = 7;

    let showAllAttentionItems = false;

    function pluralizeDays(count) {
        const lastTwoDigits = count % 100;
        const lastDigit = count % 10;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
            return "дней";
        }

        if (lastDigit === 1) {
            return "день";
        }

        if (lastDigit >= 2 && lastDigit <= 4) {
            return "дня";
        }

        return "дней";
    }

    function getDaysUntilDeadline(deadline) {
        const deadlineDate = parseDeadlineDate(deadline);

        if (!deadlineDate) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        deadlineDate.setHours(0, 0, 0, 0);

        return Math.round(
            (deadlineDate - today) / (1000 * 60 * 60 * 24)
        );
    }

    function isGoalCompleted(goal) {
        const parts = goal.parts || [];

        return parts.length > 0 && parts.every(part => part.completed);
    }

    function hasNextStep(goal) {
        const parts = goal.parts || [];

        return parts.some(part => !part.completed);
    }

    function formatDeadlineReasonText(daysUntilDeadline, prefix) {
        if (daysUntilDeadline < 0) {
            const daysAgo = Math.abs(daysUntilDeadline);

            if (daysAgo === 1) {
                return `Срок ${prefix} прошёл вчера`;
            }

            return `Срок ${prefix} прошёл ${daysAgo} ${pluralizeDays(daysAgo)} назад`;
        }

        if (daysUntilDeadline === 0) {
            return `Срок ${prefix} сегодня`;
        }

        if (daysUntilDeadline === 1) {
            return `Срок ${prefix} завтра`;
        }

        return `Срок ${prefix} через ${daysUntilDeadline} ${pluralizeDays(daysUntilDeadline)}`;
    }

    function formatAttentionDeadlineText(daysUntilDeadline) {
        return formatDeadlineReasonText(daysUntilDeadline, "цели");
    }

    function getAttentionReason(goal) {
        if (isGoalCompleted(goal)) {
            return null;
        }

        const daysUntilDeadline = getDaysUntilDeadline(goal.deadline);

        if (daysUntilDeadline !== null && daysUntilDeadline < 0) {
            return {
                priority: 1,
                className: "attention-past",
                text: formatAttentionDeadlineText(daysUntilDeadline),
                daysUntilDeadline: daysUntilDeadline
            };
        }

        if (
            daysUntilDeadline !== null &&
            daysUntilDeadline <= ATTENTION_SOON_DAYS
        ) {
            return {
                priority: 2,
                className: "attention-soon",
                text: formatAttentionDeadlineText(daysUntilDeadline),
                daysUntilDeadline: daysUntilDeadline
            };
        }

        if (!hasNextStep(goal)) {
            return {
                priority: 3,
                className: "attention-no-step",
                text: "У цели нет следующего шага",
                daysUntilDeadline: 9999
            };
        }

        return null;
    }

    function getStepAttentionItems(goals) {
        const items = [];

        goals.forEach(function(goal) {
            if (isGoalCompleted(goal)) return;

            (goal.parts || []).forEach(function(part) {
                if (part.completed || !part.deadline) return;

                const days = getDaysUntilDeadline(part.deadline);
                if (days === null) return;

                if (days < 0) {
                    items.push({
                        type: "step",
                        title: part.title,
                        goalId: goal.id,
                        goalTitle: goal.title,
                        reason: {
                            priority: 1,
                            className: "attention-past",
                            text: formatDeadlineReasonText(days, "шага"),
                            daysUntilDeadline: days
                        }
                    });
                } else if (days <= ATTENTION_SOON_DAYS) {
                    items.push({
                        type: "step",
                        title: part.title,
                        goalId: goal.id,
                        goalTitle: goal.title,
                        reason: {
                            priority: 2,
                            className: "attention-soon",
                            text: formatDeadlineReasonText(days, "шага"),
                            daysUntilDeadline: days
                        }
                    });
                }
            });
        });

        return items;
    }

    function getAttentionItems(goals) {
        const goalItems = goals
            .map(goal => {
                const reason = getAttentionReason(goal);
                if (!reason) return null;
                return {
                    type: "goal",
                    title: goal.title,
                    goalId: goal.id,
                    goalTitle: goal.title,
                    reason: reason
                };
            })
            .filter(Boolean);

        const stepItems = getStepAttentionItems(goals);

        return goalItems.concat(stepItems)
            .sort((a, b) => {
                if (a.reason.priority !== b.reason.priority) {
                    return a.reason.priority - b.reason.priority;
                }
                return a.reason.daysUntilDeadline - b.reason.daysUntilDeadline;
            });
    }

    function renderAttentionBlock(goals) {
        const attentionBlock =
            document.getElementById("attentionBlock");

        const attentionList =
            document.getElementById("attentionList");

        const attentionCounter =
            document.getElementById("attentionCounter");

        const showAllAttentionButton =
            document.getElementById("showAllAttentionButton");

        if (
            !attentionBlock ||
            !attentionList ||
            !attentionCounter ||
            !showAllAttentionButton
        ) {
            return;
        }

        const attentionItems = getAttentionItems(goals);

        if (attentionItems.length === 0) {
            attentionBlock.classList.add("hidden");
            return;
        }

        attentionBlock.classList.remove("hidden");

        attentionList.innerHTML = "";
        attentionCounter.innerText = attentionItems.length;

        const visibleItems =
            showAllAttentionItems
                ? attentionItems
                : attentionItems.slice(0, 3);

        visibleItems.forEach(item => {
            const itemElement = document.createElement("div");

            itemElement.className =
                `attention-item ${item.reason.className}`;

            const metaHtml = item.type === "step"
                ? `<span class="attention-item-meta">Шаг из цели «${item.goalTitle}»</span>`
                : "";

            itemElement.innerHTML = `
                <span class="attention-dot"></span>

                <div>
                    <span class="attention-item-title">
                        ${item.title}
                    </span>

                    ${metaHtml}

                    <span class="attention-item-reason">
                        ${item.reason.text}
                    </span>
                </div>

                <button class="attention-open-button">
                    Открыть
                </button>
            `;

            const openButton =
                itemElement.querySelector(".attention-open-button");

            openButton.addEventListener("click", () => {
                window.location.href = `goal.html?id=${item.goalId}`;
            });

            attentionList.appendChild(itemElement);
        });

        if (attentionItems.length > 3 && !showAllAttentionItems) {
            showAllAttentionButton.classList.remove("hidden");
            showAllAttentionButton.innerText =
                `Показать все (${attentionItems.length})`;

            showAllAttentionButton.onclick = () => {
                showAllAttentionItems = true;
                renderAttentionBlock(goals);
            };
        } else {
            showAllAttentionButton.classList.add("hidden");
        }
    }