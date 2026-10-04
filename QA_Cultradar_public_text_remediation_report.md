# QA — public text remediation report

Дата: 2026-10-04  
Репозиторий: `timurspace/moscow-cultradar`  
Исходный HEAD `main`: `a86d0b430871e47e68b46f0904d8ddf7ef50d975`

## Итог

- События: **1399**
- Unique ID: **1399**
- `why`: **362** заполнено / **1037** пусто
- `details`: **772** заполнено / **627** пусто
- High-confidence removals technical/generic: **1441**
- rewrite_existing_content_only: **157**
- Remaining manual review: **0**
- Изменений event-полей вне `why/details`: **0**

## Второй semantic pass

Относительно предыдущей версии PR применено **212 removals** и **86 rewrites**.

Обязательные generic/process семейства устранены полностью:
- 70 × `Опубликованное событие сезона 2026/27 базовой музыкальной площадки; включено в дальний радар.` → 0
- 39 × `Содержательная театральная работа из приоритетного контура Культрадара.` → 0
- 29 × `Публичное событие актуальной афиши РАМ имени Гнесиных.` → 0
- 39 × `Содержательная дата Консерватории: ...` → 0
- 6 × `Содержательная программа Центра Вознесенского; добавлена как часть полного прохода источников.` → 0

Дополнительно очищены очевидные формулировки того же класса: обязательная/базовая площадка как причина, политика «должен быть в календаре/радаре», «сохраняем в пуле» и internal watch/inclusion wording. В mixed случаях оставлено только уже присутствовавшее содержательное ядро.

## Финальный независимый QA

Устранены 5 остаточных process/generic `why`:
- `phil-nekrassov-impressions-2026-09-26` — `why` удалён: формулировка описывала присутствие события в базе.
- `lapp83-tiffany-dream-2026-10-01` — сохранено только содержательное культурно-историческое ядро.
- `drugoe-jazz-century-2026-10-09` — сохранён только содержательный исторический маршрут по джазу.
- `bzk-iolanta-2026` — `why` удалён как inclusion policy.
- `niko-kashpurin-temptation-beauty-2026-11-13` — `why` удалён как published-listing provenance без конкретной редакционной ценности.

Mapping синхронизирован с этими решениями; unresolved manual review остаётся **0**.

## Прежние 17 manual-review случаев

Все 17 разрешены high-confidence решением; unresolved rows: **0**. `QA_Cultradar_public_text_manual_review.csv` содержит только заголовок.

Три `bolshoi-peter-wolf-giant-2026-10-27/28/29` теперь имеют `details = "Показы 27–29 октября."`; source-verification и implementation wording удалены.

## Validator

Guard расширяется на generic/process шаблоны второго прохода и пять узких residual-сигнатур финального QA: current-base reflection, published-listing inclusion, wide-pool inclusion, editorial-line must-be-present и published-listing venue-only. Regex намеренно узкие; validator остаётся warning-only и ничего не переписывает.

Interface и Collector follow-up в этом PR не выполняются.
