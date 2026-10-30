# API documentation

## Source of truth

The OpenAPI 3 document is generated from NestJS controllers, DTOs, and Swagger decorators. Keep annotations beside the implementation; do not maintain a second hand-written description of the same endpoint.

When the API is running locally:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- API base path: `http://localhost:3000/api/v1`
- Generate the local OpenAPI file: `pnpm api:openapi` (writes `docs/api/openapi.json`).

Swagger is a developer interface. It must not expose credentials, internal secrets, private infrastructure details, or real personal data.

## Endpoint documentation checklist

Every endpoint must document:

1. Its business purpose using `@ApiOperation`.
2. Its resource group using `@ApiTags`.
3. Path and query parameters, including constraints.
4. Request body DTO and field constraints.
5. Success response schema and status code.
6. Relevant errors (`400`, `401`, `403`, `404`, `409`, `422`, `429`, or `500`, as applicable).
7. Bearer authentication using `@ApiBearerAuth` when protected.
8. Required functional roles and authorization behavior.

DTO fields should use Swagger property decorators alongside class-validator decorators so the generated contract reflects actual runtime validation.

## Authentication and authorization

Supabase Auth manages user identity and sessions. Protected API requests send the Supabase access token as `Authorization: Bearer <access-token>`. The API validates the token and resolves business roles from the application database.

The API is the authorization boundary. Hiding a button in a client is not access control. Never accept a role or permission from client-provided metadata as authoritative.

## Versioning and compatibility

All business endpoints are prefixed with `/api/v1`. Add a new API version only for a deliberate compatibility boundary; do not create versions pre-emptively. Prefer additive changes and preserve existing response semantics. Document breaking changes and the migration path before release.

## Error contract

Errors must use stable HTTP status codes and messages that are safe to expose to clients. Do not return stack traces, SQL, token contents, provider secrets, or other internal details. A consistent machine-readable error envelope will be enforced centrally by the API exception layer; endpoint documentation must reflect the actual envelope rather than inventing a local shape.

## Change workflow

Update endpoint decorators, DTO metadata, tests, and this documentation in the same pull request as the behavior change. The CI pipeline must generate the OpenAPI document and validate that the generation succeeds. Contract snapshots or compatibility checks can be added when the API surface becomes stable enough to baseline.
