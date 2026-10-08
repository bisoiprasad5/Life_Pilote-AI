import asyncio
import json
from app.schemas.task_parser import TaskParseRequest
from app.providers.factory import provider_manager


async def run_tests():
    provider = provider_manager.get_provider()
    print(f"Testing with Provider: {provider.name}")

    test_cases = [
        "Remind me to study Java DSA tomorrow at 7 PM for 1 hour.",
        "Study OS for 2 hours tomorrow.",
        "Every Sunday remind me to plan my week.",
        "Submit assignment before Friday 5 PM.",
        "Gym workout tomorrow morning at 6:30 AM for 45 minutes",
        "Pay electricity bill by end of month high priority",
        "Doctor appointment on October 15 at 2:30 PM",
    ]

    # Reference fixed date: 2026-10-05 (Monday) 12:00:00
    fixed_ref_date = "2026-10-05 12:00:00"

    print("=" * 80)
    for text in test_cases:
        req = TaskParseRequest(text=text, referenceDate=fixed_ref_date, timezone="UTC")
        res = await provider.parse_task(req)
        print(f"\nINPUT: '{text}'")
        print(f"RESULT:")
        print(json.dumps(res.model_dump(), indent=2, default=str))
        print("-" * 80)

if __name__ == "__main__":
    asyncio.run(run_tests())
