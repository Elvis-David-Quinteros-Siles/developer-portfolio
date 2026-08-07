"""Exporta el SDL del schema GraphQL (con el registro de apps ya cargado)."""
from __future__ import annotations

from pathlib import Path

from django.core.management.base import BaseCommand
from strawberry.printer import print_schema


class Command(BaseCommand):
    help = "Imprime o escribe el SDL del schema Strawberry."

    def add_arguments(self, parser):
        parser.add_argument("--output", default="-", help="Ruta de salida ('-' = stdout)")

    def handle(self, *args, **options):
        from portfolio.gql.schema import schema

        sdl = print_schema(schema).rstrip() + "\n"
        output = options["output"]
        if output == "-":
            self.stdout.write(sdl)
        else:
            Path(output).write_text(sdl, encoding="utf-8", newline="\n")
            self.stdout.write(f"Schema exportado a {output}")
