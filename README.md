# Journal

A small, type-safe journal app written in **TypeScript**. You can write entries with a title, some text and a mood, then edit, delete, filter and search them. Everything is saved in the browser's `localStorage`, so there is no server and no account.

Built for the AmaliTech **FEM05 TypeScript Fundamentals** lab. The Git workflow (FEM06) is described in [GIT_WORKFLOW.md](GIT_WORKFLOW.md).

## Features

- **Add, edit and delete** journal entries (title, content, mood)
- **Five moods**: Happy, Sad, Motivated, Stressed, Calm, each with its own colour dot
- **Filter by mood** and **search** by title or content (not case-sensitive)
- **Validation**: empty titles, empty text and invalid moods are rejected with a clear message
- **Saved automatically** after every change, and survives a page refresh
- **Safe**: user text is HTML-escaped before it is shown, and corrupted saved data falls back to an empty journal instead of crashing
- **Responsive** from 375px phones to desktop, with **light and dark mode**
- **Accessible**: labels on every input, visible focus styles, keyboard support (Escape cancels an edit) and screen-reader announcements

## Tech stack

- **TypeScript** (strict mode), compiled with `tsc` to ES2020 JavaScript modules
- **HTML and CSS**, no framework
- **localStorage** for saving data
- **Vite**, only as an optional local dev server

## Setup

```bash
npm install        # install TypeScript, ts-node and Vite
npx tsc            # compile src/*.ts into dist/*.js (or: npm run build)
npm run watch      # optional: recompile automatically while editing
```

Then open `index.html` through a local server, for example:

- VS Code **Live Server**: right-click `index.html` → *Open with Live Server*
- or `npx vite`, then open the address it prints (http://localhost:5173)

> Opening the file directly (`file://`) does not work, because browsers block JavaScript modules there.

## Project structure

```
journal app/
├── index.html          Entry point: page markup, loads dist/journal.js
├── src/
│   ├── types.ts        Mood enum, JournalEntry interface, Journal type alias, other types
│   ├── journal.ts      Core logic and event handlers: add, edit, delete, filter, findByProperty
│   ├── storage.ts      Type-safe localStorage load/save and type guards
│   ├── ui.ts           All DOM work: rendering entries, the form, filters, theme
│   └── styles/
│       └── main.css    Design: colours, layout, dark mode, responsive rules
├── dist/               Compiled JavaScript (output of `npx tsc`)
├── public/
│   └── favicon.svg
├── tsconfig.json       strict, rootDir ./src, outDir ./dist, target/module es2020
└── package.json        Scripts: build (tsc), watch (tsc --watch), dev (vite)
```

## TypeScript concepts used

| Concept | Where |
| --- | --- |
| `enum` | `Mood` in `types.ts` |
| `interface` | `JournalEntry`, `EntryFilter`, `ValidationError` in `types.ts` |
| Type alias | `type Journal = JournalEntry[]` in `types.ts` |
| Union types | `Theme`, `CardAction`, `Mood \| 'all'` in `types.ts` |
| Utility types | `Partial<JournalEntry>` (`addEntry`), `Omit` (`EntryDraft`), `Record<Mood, string>` (mood labels) |
| Generics | `findByProperty<T>()` in `journal.ts`, `TypedStorage<T>` and `isArrayOf<T>()` in `storage.ts`, `getElement<T>()` in `ui.ts`, `Result<T>` in `types.ts` |
| Type guards | `isJournalEntry`, `isMood`, `isTheme` in `storage.ts` |
| `unknown` instead of `any` | `JSON.parse` result in `storage.ts` |
| Classes and access modifiers | `JournalStore` (`journal.ts`) and `EntryForm` (`ui.ts`), with `private`, `readonly` and a `get` accessor |
| Typed DOM access | `querySelector<T>()` with a null and `instanceof` check in `getElement` (`ui.ts`) |

## Compiler notes

Real errors TypeScript caught while I was building this, before anything ran in the browser.

### 1. Using a newer string method than my target allows

```
src/utils/dom.ts(21,6): error TS2550: Property 'replaceAll' does not exist on type 'string'.
Do you need to change your target library? Try changing the 'lib' compiler option to 'es2021' or later.
```

When I changed `target` to `es2020`, `tsc` flagged `replaceAll()`, which only exists from ES2021. An older browser would have crashed on it when someone saved an entry.
**Fix:** I used `.replace(/&/g, '&amp;')` with a global regular expression, which works in ES2020.

### 2. Passing a plain string where a `Mood` is expected

```
src/utils/moods.ts(5,5): error TS2322: Type '"happy"' is not assignable to type 'Mood'.
```

After I turned `Mood` into an `enum`, the old code still used plain strings like `'happy'`. TypeScript only accepts the enum members.
**Fix:** I used `Mood.HAPPY`, `Mood.SAD` and so on. A typo like `Mood.HAPY` is now also a compile error.

### 3. Using a property that no longer exists

```
src/ui.ts(116,58): error TS2339: Property 'date' does not exist on type 'JournalEntry'.
```

I changed `JournalEntry` to the lab's interface (`id`, `title`, `content`, `mood`, `timestamp`), which removed the old `date` field. `tsc` listed all 18 places that still used old fields, so none of them could break silently at runtime.
**Fix:** the date is now shown from `entry.timestamp` with `new Date(timestamp).toLocaleString()`.

### 4. A misspelled property name

```
src/journal.ts(183,32): error TS2345: Argument of type '"titel"' is not assignable to parameter of type 'keyof JournalEntry'.
```

`findByProperty<T>(list, key: keyof T, value)` only accepts real property names of `T`. Without TypeScript, `'titel'` would simply never match anything, and the bug would be hard to find.
**Fix:** use `'title'`.

### 5. Missing a required field

```
src/journal.ts(67,11): error TS2322: Type '{ ...; title?: string | undefined; ... }' is not assignable to type 'JournalEntry'.
  Types of property 'title' are incompatible.
    Type 'string | undefined' is not assignable to type 'string'.
```

`addEntry` receives a `Partial<JournalEntry>`, where every field may be missing. When I tried to build the entry straight from that input, TypeScript refused, because a `JournalEntry` must have a title.
**Fix:** `addEntry` calls `validateEntry()` first. That returns either the checked fields or a list of errors, and only the checked fields are used to build the entry.
