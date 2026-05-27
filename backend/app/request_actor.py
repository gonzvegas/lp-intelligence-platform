"""Resolve acting user from JWT claims or dev headers."""

from __future__ import annotations

from fastapi import Request


def actor_from_request(request: Request) -> tuple[str, str]:
    """
    Return (actor display name, persona id).
    Frontend may send X-Actor-Name and X-Actor-Persona when JWT user profile is unavailable.
    """
    header_name = (request.headers.get("x-actor-name") or "").strip()
    header_persona = (request.headers.get("x-actor-persona") or "").strip() or "admin"

    claims = getattr(request.state, "jwt_claims", None)
    if isinstance(claims, dict):
        name = (
            claims.get("name")
            or claims.get("preferred_username")
            or claims.get("email")
            or claims.get("upn")
            or header_name
            or "Authenticated user"
        )
        return str(name), header_persona

    if header_name:
        return header_name, header_persona

    return "API user", header_persona
