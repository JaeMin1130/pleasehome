# TESTING

## web/ (Next.js)

- **Framework:** Vitest + @testing-library/react (jsdom environment)
- **Run:** `cd web && npm test` (= `vitest run`)
- **Config:** `web/vitest.config.ts`, setup file `web/vitest.setup.ts`
- **Conventions:** colocate `*.test.tsx` next to the component it tests (e.g. `src/components/ui/MarkdownViewer.test.tsx`). Assert real rendered behavior (`getByText`, `queryByText`), not implementation details.
- **CI:** `.github/workflows/test.yml` runs `npm test` in `web/` on every push/PR.

## backend/ (Kotlin + Spring Boot)

- Existing tests live in `backend/src/test/kotlin/`.
- **Run:** `./command.sh backend:test` (see `README.md`).

## db-pipeline/

No test framework configured; not covered by CI.
