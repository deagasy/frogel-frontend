# Frogel Frontend — Claude Instructions

## Project identity

Frogel is a calm long-term goal tracker built around the metaphor of an expedition to a mountain summit.

It is not a todo list, task manager, Jira, Trello, Excel, or KPI system.

The user moves toward a big goal through small steps. A goal is an expedition, parts of a goal are route steps, and the final goal is the summit. Deadlines should feel like route points, not harsh corporate due dates.

## Product tone

The product should feel:

* calm
* friendly
* softly motivating
* a little cute, but not childish
* not corporate
* not gamified in a loud way

Use practical Russian UI words first:

* цель
* шаг
* срок
* дедлайн, only when technically clearer

Do not overuse metaphors in functional labels.

## Product language rule

Do not overuse the expedition metaphor in functional UI copy.

Use practical UI terms first:

* цель
* шаг
* задача, where it fits naturally and does not make Frogel feel like Jira
* план на сегодня
* следующий шаг

Avoid using "маршрут" as a common UI term.
The expedition/mountain concept should stay mostly in visuals, illustrations, hero atmosphere, and subtle product feeling — not in every label or empty-state text.

## Visual style

Frontend should keep the Frogel visual style:

* light interface
* white cards
* soft lavender, purple, pink, and blue gradients
* rounded corners
* light shadows
* calm feeling of movement forward
* moderate use of the frog traveler mascot

Avoid:

* harsh corporate dashboards
* dense tables
* Jira/Trello-like task boards
* aggressive KPI language
* childish/cartoon UI

## Current architecture

This is the standalone frontend repo.

Technologies:

* HTML
* CSS
* Vanilla JavaScript

Main files:

* index.html — main goals page
* script.js — main page logic
* goal.html — single goal page
* goal.js — goal page logic
* styles.css — shared styles
* api.js — backend base URL helper
* deadlineUtils.js — shared deadline formatting/status helpers
* todayPlan.js — Today Plan logic
* attention.js — Attention block logic

The backend runs separately on:
http://localhost:8080

The frontend runs locally on:
http://localhost:5500/index.html

api.js contains the backend base URL. Do not hardcode backend URLs directly in feature files.

## Important script order

index.html should load scripts in this order:

1. api.js
2. deadlineUtils.js
3. todayPlan.js
4. attention.js
5. script.js

goal.html should load scripts in this order:

1. api.js
2. deadlineUtils.js
3. todayPlan.js
4. goal.js

Do not break this order.

## Current implemented frontend features

Main page:

* goal creation
* goals list
* Today Plan
* Attention block
* goal deadline display
* deletion of goals

Goal page:

* goal details
* progress bar
* next step card
* adding normal steps
* adding measurable steps
* adding progress to measurable steps
* deleting steps
* editing goal deadline
* empty state for goals without parts
* empty state for completed goals

## Working rules

Always work in small safe slices.

Before changing code:

1. Explain briefly why the change is needed.
2. Identify which files will be touched.
3. Preserve existing ids used by JavaScript.
4. Avoid large rewrites.
5. Prefer wrapping existing markup with new classes over rebuilding working blocks.
6. Do not change backend behavior from frontend tasks.
7. Do not change API payloads unless explicitly asked.
8. Do not rename existing functions unless necessary.
9. Do not replace working logic with a new architecture.

After changing code:

1. Summarize changed files.
2. Mention any risk.
3. Suggest a small manual smoke test.
4. Do not commit unless explicitly asked.

## Git rules

Before changes, check:

git status

Do not commit or push unless the user explicitly asks.

## Frontend run command

From the repo root:

python -m http.server 5500

Open:

http://localhost:5500/index.html

## Backend requirement for manual testing

Backend should be running separately from:

C:\Users\diana\Downloads\frogel-backend

On:

http://localhost:8080

## Common risks

* Do not remove ids used in JavaScript.
* Do not break script order.
* Do not use smart quotes in JavaScript.
* Do not hardcode fetch("/goals") when standalone frontend requires apiUrl("/goals").
* Do not change Today Plan or Attention logic during layout-only tasks.
* If Network shows no requests, check Console for JavaScript syntax errors first.

## Frogel design system v0

Frogel should gradually move toward a simple 4px-based visual system.

Use sizes that are divisible by 4 whenever practical.

Preferred spacing scale:

* 4px
* 8px
* 12px
* 16px
* 20px
* 24px
* 32px
* 40px
* 48px
* 64px

Preferred font-size scale:

* 12px — small labels, helper text, badges
* 16px — default body text, inputs, buttons
* 20px — card titles / section titles
* 24px — important page section headings
* 32px — main page title / hero title

Avoid random font sizes like 13px, 15px, 17px, 18px, 21px unless there is a very strong reason.

Preferred border-radius scale:

* 8px — small controls, badges
* 12px — inputs, small cards
* 16px — standard cards
* 20px — large cards
* 24px — modals / hero blocks

Preferred line-height should also feel systematic:

* 16px for 12px text
* 24px for 16px text
* 28px or 32px for 20px/24px headings
* 40px for 32px headings

Important:
Do not force the entire app into the system in one huge rewrite. Apply it gradually in small slices.

## Current next product direction

Next planned slice:
Design Tokens v0 + Goal Cards Polish v1

* Add CSS custom properties (design tokens) to styles.css.
* Polish goal cards to use the 4px-based font and spacing scale.
* Keep existing layout structure and JavaScript behavior.
