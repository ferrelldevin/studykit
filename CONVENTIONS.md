# Conventions

The rules this repo runs on. Read this before editing anything.

## 1. Public repo = course-general material only

This repository is public. Anything built for one named learner — their name, their e-mail,
their section, a sheet personalised to them — **stays out of it**. That material lives in
Google Drive, shared to a named account as Viewer, Restricted. Never "anyone with the link."

This split is the whole reason the repo can be public at all. It is not a style preference.

## 2. On the syllabus, or not on the page

No grammar and no vocabulary the course has not assigned. If it is not in the lesson the
sheet names, it does not go on the sheet. A student reading these should never meet
something their instructor has not introduced.

## 3. No romaji on Japanese sheets

Kanji with furigana, including inside English explanations. The one deliberate exception is
a recognition drill, where bare characters are the point of the exercise — those are marked
as such in the sheet itself.

## 4. Read before you retrieve

Answers print first and fade across repetitions. Cold production comes last.

A timed recall gate before the answer reveals was considered and **rejected**: it rehearses
the freeze rather than curing it. Do not reintroduce one.

## 5. Adding a sheet

A new sheet is a new folder at `<course>/<sheet-slug>/index.html`, plus a card on the front
door in `index.html`. **No existing URL ever moves.** People save these links and print them;
a moved URL breaks a printout that is already on someone's desk.

## 6. Every page is a complete document

Sheets that began life as Claude artifacts are fragments — the artifact platform injects the
doctype, `<head>`, charset, viewport and a body reset at publish time. A file in this repo
must carry all of that itself. **The viewport meta is the one that bites**: without it the
page renders at desktop width on a phone, which is where these actually get read.

## 7. Things that already went wrong once

- `overflow:hidden` silently clipped print output twice. It is gone. Do not reintroduce it
  to "fix" a layout — check the print render instead.
- `.rule h2{flex:1}` beside a `white-space:nowrap` label caused sideways scroll at 390px.
  Fixed with `min-width:0` plus a wrap at 560px. The same pattern will bite any new sheet
  that copies that rule header.
- `.nojekyll` must sit at the **repo root**, not inside a course folder.

## 8. Before you publish

Check, on the live pages, that:

1. every URL serves — and an address that should not exist returns 404;
2. no page scrolls sideways at 320, 390, 768 or 1280px;
3. no romaji and no personal identifier appears on any sheet.

`verify-studykit.mjs` in the build scratchpad runs all three.
