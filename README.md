# Frogel — Frontend

Static HTML/CSS/JS frontend for the Frogel goal tracker.

## Files

| File | Purpose |
|---|---|
| `index.html` | Goals list page |
| `goal.html` | Single goal page |
| `styles.css` | Shared styles |
| `script.js` | Goals list logic |
| `goal.js` | Single goal logic |
| `todayPlan.js` | Today plan widget |
| `attention.js` | Attention block widget |
| `deadlineUtils.js` | Shared deadline helpers |

## Development

During development the frontend is served by the Spring Boot backend
from its `src/main/resources/static/` directory.

Backend repository: [frogel-backend](https://github.com/deagasy/frogel-backend)

## Notes

- No build step required — plain HTML, CSS, and vanilla JS.
- All API calls point to `http://localhost:8080` by default.
