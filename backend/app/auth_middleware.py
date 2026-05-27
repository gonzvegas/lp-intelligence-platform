"""
Optional Bearer JWT validation for Entra ID access tokens (RS256 JWKS).

When ``skip_jwt_auth`` is true (default in development), validation is skipped.
"""

from typing import Awaitable, Callable

import jwt
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

from fastapi import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.config import settings

_jwk_client: PyJWKClient | None = None


def _jwks_url() -> str:
    tenant = settings.jwt_tenant_id.strip()
    return f"https://login.microsoftonline.com/{tenant}/discovery/v2.0/keys"


def _issuer() -> str:
    tenant = settings.jwt_tenant_id.strip()
    return f"https://login.microsoftonline.com/{tenant}/v2.0"


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(_jwks_url())
    return _jwk_client


def _exempt_path(path: str) -> bool:
    if path.rstrip("/") == "/health":
        return True
    if path in ("/docs", "/redoc", "/openapi.json"):
        return True
    return path.startswith("/docs") or path.startswith("/redoc")


async def jwt_auth_dispatch(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Starlette-compatible dispatch for tests or manual wiring."""

    if request.method == "OPTIONS":
        return await call_next(request)

    if settings.skip_jwt_auth or _exempt_path(request.url.path):
        return await call_next(request)

    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        return Response('{"detail":"Not authenticated"}', status_code=401, media_type="application/json")

    token = auth_header.partition(" ")[2].strip()
    tenant = settings.jwt_tenant_id.strip()
    audience = settings.jwt_audience.strip()
    if not tenant or not audience:
        return Response(
            '{"detail":"JWT validation enabled but JWT_TENANT_ID or JWT_AUDIENCE missing"}',
            status_code=503,
            media_type="application/json",
        )

    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=audience,
            issuer=_issuer(),
            options={"require": ["exp", "iat"]},
        )
    except PyJWTError:
        return Response('{"detail":"Invalid or expired token"}', status_code=401, media_type="application/json")

    request.state.jwt_claims = payload  # pragma: no cover — reserved for downstream dependencies
    return await call_next(request)


class JwtAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        return await jwt_auth_dispatch(request, call_next)
