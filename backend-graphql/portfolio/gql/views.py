"""Vista GraphQL con contexto por request (request + DataLoaders).

Se usa AsyncGraphQLView (Django la adapta bajo WSGI) porque los DataLoaders
de Strawberry requieren ejecución async; el ORM se accede vía sync_to_async.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from strawberry.django.context import StrawberryDjangoContext
from strawberry.django.views import AsyncGraphQLView

from portfolio.gql.loaders import Loaders


@dataclass
class PortfolioContext(StrawberryDjangoContext):
    loaders: Loaders = field(default_factory=Loaders)


class PortfolioGraphQLView(AsyncGraphQLView):
    async def get_context(self, request, response) -> PortfolioContext:
        return PortfolioContext(request=request, response=response, loaders=Loaders())
