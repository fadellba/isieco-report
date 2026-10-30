# Engineering standards — ISI-Eco Report

These rules apply to every application and package in this monorepo.

## Product architecture

- Keep the backend as a modular monolith. Do not introduce microservices without a documented, measured need.
- Keep business modules independent and organize non-trivial backend modules into domain, application, infrastructure, and presentation responsibilities.
- Keep dependencies pointing inward: domain code must not depend on NestJS, Prisma, Supabase, HTTP, or framework-specific details.
- Use NestJS dependency injection. Depend on ports/abstractions where that protects the domain or makes a real boundary testable; do not create interfaces for every class by reflex.
- Web and mobile clients communicate with the backend through the API client. They must never connect directly to the business PostgreSQL database.
- `packages/shared` contains framework-independent contracts only. Do not turn it into a catch-all package.

## Non-negotiable quality principles

- **Security by design:** validate all untrusted input, enforce authorization on the server, apply least privilege, protect secrets, minimize personal data, and audit sensitive actions.
- **Maintainability:** prefer cohesive modules, explicit names, small focused functions, strict TypeScript, automated tests, and documentation close to the code.
- **Evolvability:** preserve clear module boundaries, stable API contracts, and versioned database migrations. Prefer backward-compatible changes when practical.
- **SOLID, DI, DRY, KISS, YAGNI:** apply these as engineering judgement, not as excuses to add abstractions or layers without a real use case.
- Never trust a role, account state, owner identifier, or permission supplied by a browser or mobile client. Resolve authorization from trusted server-side data.
- Never expose Supabase service-role keys, database credentials, private tokens, or other secrets to client bundles or logs.

## API requirements

- The REST API is versioned under `/api/v1`.
- Maintain the OpenAPI 3 specification generated from NestJS decorators and DTO metadata.
- Every endpoint must document its purpose, parameters, request schema, successful responses, relevant error responses, authentication, and required roles.
- Update Swagger/OpenAPI metadata in the same change as endpoint or DTO changes.
- Keep the interactive Swagger UI at `/docs` and the machine-readable document at `/docs-json`.
- Do not add undocumented endpoints or silently change an existing response contract.

## Code and commits

- TypeScript strict mode is required. Avoid `any`; explain exceptional uses.
- Validate DTOs at API boundaries. Do not rely on client-side validation for security.
- Add unit tests for business rules and integration tests for persistence, authorization, and HTTP behavior where relevant.
- Keep Prisma schema changes and migrations in the same change. Review generated SQL before applying it to shared or production databases.
- Follow Conventional Commits: `type(scope): description` (for example `feat(reports): create citizen report`). Use imperative, concise descriptions. Commit messages are written in English.
- Do not commit secrets, `.env` files, generated build output, or local dependency folders.

## Definition of Done

A change is complete only when its functional behavior, security and authorization, tests, TypeScript checks, formatting checks, API documentation, and relevant user/developer documentation have been reviewed. CI must pass. Record any intentionally deferred item explicitly.

## Repository commands

Use the pinned Node.js and pnpm versions declared in `.nvmrc`, `.node-version`, and `package.json`.

- `pnpm install`
- `pnpm format:check`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
