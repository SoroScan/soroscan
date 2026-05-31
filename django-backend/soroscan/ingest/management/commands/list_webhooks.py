from django.core.management.base import BaseCommand

from soroscan.ingest.models import ContractEvent, WebhookSubscription


class Command(BaseCommand):
    help = "List webhook subscriptions with ID, URL, status, and event count."

    def add_arguments(self, parser):
        parser.add_argument(
            "--active-only",
            action="store_true",
            help="Only show active (non-suspended) webhooks",
        )

    def handle(self, *args, **options):
        qs = WebhookSubscription.objects.select_related("contract").order_by("id")

        if options["active_only"]:
            qs = qs.filter(is_active=True, status=WebhookSubscription.STATUS_ACTIVE)

        webhooks = list(qs)
        if not webhooks:
            self.stdout.write("No webhooks found.")
            return

        rows = []
        for wh in webhooks:
            event_qs = ContractEvent.objects.filter(contract=wh.contract)
            if wh.event_type:
                event_qs = event_qs.filter(event_type=wh.event_type)
            rows.append((str(wh.id), wh.target_url, wh.status, str(event_qs.count())))

        col_widths = [
            max(len("ID"), max(len(r[0]) for r in rows)),
            max(len("URL"), max(len(r[1]) for r in rows)),
            max(len("Status"), max(len(r[2]) for r in rows)),
            max(len("Event Count"), max(len(r[3]) for r in rows)),
        ]

        def fmt(cols):
            return " ".join(c.ljust(w) for c, w in zip(cols, col_widths))

        self.stdout.write(fmt(["ID", "URL", "Status", "Event Count"]))
        self.stdout.write(" ".join("-" * w for w in col_widths))
        for r in rows:
            self.stdout.write(fmt(r))
