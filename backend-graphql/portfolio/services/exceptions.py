"""Errores de dominio de la capa de servicios."""


class DomainError(Exception):
    """Error de negocio con código estable para la capa GraphQL."""

    code = "DOMAIN_ERROR"

    def __init__(self, message: str, code: str | None = None):
        super().__init__(message)
        if code:
            self.code = code


class ValidationError(DomainError):
    code = "BAD_USER_INPUT"


class AuthenticationError(DomainError):
    code = "UNAUTHENTICATED"


class NotFoundError(DomainError):
    code = "NOT_FOUND"
