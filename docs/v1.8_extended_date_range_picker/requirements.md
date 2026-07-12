# Super Daterange Picker

In short: Grafana's Daterange Picker


I'd describe it as a **two-panel date/time range picker optimized for power users**, combining relative and absolute time selection in a single floating popover.

---

# Grafana-style Date Range Picker

## Overall Layout

A floating dark-themed popover (~850×500px) divided into **two vertical panels**.

```
+---------------------------------------------------------------+
|                 Header                                         |
| [ ⏱ Last 6 hours ▼ ]                         [ Search ]        |
+---------------------------+-----------------------------------+
|                           |                                   |
| Left panel                | Right panel                      |
| Absolute Time             | Quick Ranges                     |
|                           |                                   |
|                           |                                   |
|                           |                                   |
|                           |                                   |
+---------------------------+-----------------------------------+
| Browser Time  Belgium     | UTC+02:00    Change settings     |
+---------------------------------------------------------------+
```

---

# Header

Top bar contains

* Current selected range shown as a dropdown button

Example

```
[ ⏱ Last 6 hours ▼ ]
```

On the far right

```
🔍 Search
```

Search filters the quick ranges.

---

# Left Panel — Absolute Time Range

Title

```
Absolute time range
```

Contains two labeled datetime inputs.

## From

```
From

+-------------------------+
| now-6h        📅        |
+-------------------------+
```

## To

```
To

+-------------------------+
| now           📅        |
+-------------------------+
```

Inputs accept

* ISO dates
* date/time
* relative expressions

Examples

```
2025-07-10 15:00
now
now-6h
now-7d
```

Calendar icon opens a calendar/time picker.

---

## Action Buttons

Below the inputs.

Small square buttons followed by primary action.

```
[🕘] [📋]  [ Apply time range ]
```

Meaning

History

Recent values

Apply

The Apply button is the visual primary action.

---

## Recently Used

Section title

```
Recently used absolute ranges
```

Scrollable list.

Each item displays

```
2025-01-01 00:00:00
to
2025-06-30 23:59:59
```

or

```
2025-06-29 00:00:00
to
2025-06-30 23:59:59
```

Clicking immediately fills the inputs.

---

# Right Panel — Quick Ranges

Top

Search field

```
🔍 Search quick ranges
```

Filters instantly.

---

Scrollable categorized list.

Example entries

```
Last 7 days
Last 30 days
Last 90 days
Last 6 months
Last 1 year
Last 2 years
Last 5 years
Previous week
Previous month
Previous fiscal quarter
Previous year
Previous fiscal year
This week
This week so far
This month
This month so far
This year
This year so far
```

Selecting one immediately updates the current range.

Selected item has a highlighted background.

Hover shows a subtle darker shade.

---



# Interaction Model

* Clicking a quick range immediately updates the selection.
* Manual edits are staged until **Apply time range** is pressed.
* Relative expressions (`now-6h`, `now-7d`, `now/M`, etc.) are preserved rather than converted to absolute timestamps.
* Calendar icons open a date/time picker without replacing the text input.
* The recent-history list is clickable and repopulates the form.
* The search box filters quick ranges in real time.
* The quick-range list and recent-history list scroll independently.
* The popover closes when clicking outside or pressing **Esc**, unless there are unapplied edits.

---


