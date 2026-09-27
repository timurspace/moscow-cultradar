# PROJECT HANDOFF — «Культрадар»

Этот файл — короткая точка входа для нового чата. Он **не** является журналом истории и **не** хранит текущие counts вручную.

## Что это за проект

«Культрадар» — публичная московская культурная афиша с широким подтверждённым календарём, редакционными метками и приватным пользовательским слоем в браузере.

- Repo: `timurspace/moscow-cultradar`
- Branch: `main`
- Public site: https://timurspace.github.io/moscow-cultradar/
- Brand: «Культрадар»

## Что читать сначала

1. **`PROJECT_STATE.md`** — актуальные counts, coverage, automation, известные проблемы и ближайший backlog.
2. **`PROJECT_RULES.md`** — стабильные продуктовые, редакционные, data и QA правила.
3. **`PROJECT_HISTORY.md`** — только если нужна история решения, старые counts, миграции или закрытые bugfixes.

Если документация расходится с фактическим GitHub, **фактический `main`, JSON, код и GitHub Actions имеют приоритет**. После этого документацию надо синхронизировать.

## Рабочие файлы

- `index.html` — каркас интерфейса;
- `styles.css` — оформление и responsive layout;
- `app.js` — render, filters, private state, visited, calendar, export/import;
- `events.json` — публичные события;
- `sources.json` — physical venues, discovery sources, monitor entities/groups и coverage;
- `validate.js` — машинный аудит данных;
- `.github/workflows/audit.yml` — data audit workflow;
- `README.md` — краткая публичная документация;
- `PROJECT_STATE.md` — текущая картина;
- `PROJECT_RULES.md` — постоянные правила;
- `PROJECT_HISTORY.md` — исторический журнал.

## Роли рабочих чатов

**Content / sweep chat:** обновляет события и coverage. Не меняет UI без отдельной необходимости.

**Technical / architecture chat:** исправляет interface, validator, workflow и data architecture. Не пересобирает редакционную концепцию без причины.

**New handoff chat:** сначала проверяет GitHub и читает STATE + RULES; продолжает ближайшую задачу, а не начинает проект заново.

Weekly automation — отдельный content-maintenance контур. Её актуальный статус и cadence смотреть в `PROJECT_STATE.md`.

## Алгоритм нового чата

1. Открыть repo и убедиться, что работа идёт с актуальным `main`.
2. Прочитать `PROJECT_STATE.md` и `PROJECT_RULES.md`.
3. Проверить фактические `events.json`, `sources.json`, relevant code и последние Actions; не доверять старому числу только потому, что оно написано в Markdown. Для большого `events.json` следовать правилу полного чтения через Git blob из `PROJECT_RULES.md`.
4. Выбрать **одну** ближайшую задачу из STATE.
5. Менять минимальный набор файлов; content-only задача не должна случайно превращаться в UI refactor.
6. Перед commit прогнать доступный QA/validator и проверить JSON/schema assumptions.
7. Делать атомарный commit.
8. После commit проверить GitHub Actions / Pages deployment.
9. Если изменились counts, coverage, schema, automation или backlog — обновить `PROJECT_STATE.md`.

## Нельзя начинать заново

Не создавать новый repo, не менять GitHub user/brand, не возвращаться к старым названиям и не предлагать новую архитектуру только ради переписывания.

Принято:

- user: `timurspace`;
- repo: `moscow-cultradar`;
- public site: GitHub Pages;
- data-first static architecture работает и остаётся базовой до появления измеримой причины её менять.

Длинная история старого handoff перенесена в `PROJECT_HISTORY.md`; стабильные правила — в `PROJECT_RULES.md`; текущая работа — в `PROJECT_STATE.md`.