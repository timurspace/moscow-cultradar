# QA — public text remediation report

Дата: 2026-10-04  
Репозиторий: `timurspace/moscow-cultradar`  
Исходный HEAD `main`: `a86d0b430871e47e68b46f0904d8ddf7ef50d975`

## Итог

- События: **1399**
- Unique ID: **1399**
- `why`: **365** заполнено / **1034** пусто
- `details`: **772** заполнено / **627** пусто
- High-confidence removals technical/generic: **1438**
- rewrite_existing_content_only: **155**
- Remaining manual review: **0**
- Изменений event-полей вне `why/details`: **0**

## Второй semantic pass

Относительно предыдущей версии PR применено **209 removals** и **84 rewrites**.

Обязательные generic/process семейства устранены полностью:
- 70 × `Опубликованное событие сезона 2026/27 базовой музыкальной площадки; включено в дальний радар.` → 0
- 39 × `Содержательная театральная работа из приоритетного контура Культрадара.` → 0
- 29 × `Публичное событие актуальной афиши РАМ имени Гнесиных.` → 0
- 39 × `Содержательная дата Консерватории: ...` → 0
- 6 × `Содержательная программа Центра Вознесенского; добавлена как часть полного прохода источников.` → 0

Дополнительно очищены очевидные формулировки того же класса: обязательная/базовая площадка как причина, политика «должен быть в календаре/радаре», «сохраняем в пуле» и internal watch/inclusion wording. В mixed случаях оставлено только уже присутствовавшее содержательное ядро.

## Прежние 17 manual-review случаев

Все 17 разрешены high-confidence решением; unresolved rows: **0**. `QA_Cultradar_public_text_manual_review.csv` содержит только заголовок.

Три `bolshoi-peter-wolf-giant-2026-10-27/28/29` теперь имеют `details = "Показы 27–29 октября."`; source-verification и implementation wording удалены.

## Validator

Guard расширяется на generic/process шаблоны второго прохода: published-season/base-venue/radar, priority contour, public current listing, «Содержательная дата Консерватории», full source pass, mandatory venue и calendar/radar/pool inclusion policy. Validator остаётся warning-only и ничего не переписывает.

Interface и Collector follow-up в этом PR не выполняются.
