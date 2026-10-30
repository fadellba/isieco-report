# Engineering principles

Security, maintainability, and evolvability are primary design constraints for ISI-Eco Report.

## Security

- Apply security by design and least privilege.
- Authenticate identities with Supabase Auth and authorize every protected operation in the API.
- Validate and normalize untrusted inputs at system boundaries.
- Protect secrets, uploads, personal data, and sensitive operational history.
- Keep auditability for role assignments, status transitions, and other sensitive actions.
- Test both allowed and denied access paths.

## Maintainability

- Keep modules cohesive and business rules close to their domain.
- Separate domain rules from HTTP, persistence, and provider-specific details.
- Prefer dependency injection at explicit boundaries.
- Use strict typing, meaningful names, focused functions, and tests that protect behavior.
- Keep API and architecture documentation synchronized with implementation.

## Evolvability

- Use stable module contracts and versioned database migrations.
- Favor additive API changes where possible.
- Keep external integrations behind adapters when doing so isolates vendor-specific behavior.
- Measure operational constraints before scaling infrastructure or splitting services.

## SOLID, DI, DRY, KISS, YAGNI

These principles guide trade-offs. They do not justify speculative abstractions, generic frameworks for one use case, excessive indirection, or premature microservices. Introduce a pattern when it reduces a concrete maintenance, testing, security, or change cost.
