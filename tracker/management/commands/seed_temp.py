# tracker/management/commands/seed_temp.py
from django.core.management.base import BaseCommand
from tracker.models import Category

CATEGORIES = [
    "Economic",
    "Environmental",
    "Legal",
    "Political",
    "Social",
    "Technological",
]

class Command(BaseCommand):
    help = "Seed baseline data for temporary/dev DB (SQLite). Adds Categories if missing."

    def handle(self, *args, **options):
        created = 0
        for name in CATEGORIES:
            _, was_created = Category.objects.get_or_create(name=name)
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Seed done. Categories added: {created}, total now: {Category.objects.count()}"))
