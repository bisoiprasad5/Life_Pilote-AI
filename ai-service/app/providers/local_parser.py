import re
from datetime import datetime, timedelta, time as dt_time
from typing import Optional, Tuple, List, Dict, Any
from dateutil import parser as date_parser

from app.schemas.task_parser import (
    TaskParseRequest,
    TaskParseResponse,
    ParsedTask,
    TaskCategory,
    TaskPriority,
    RecurrenceInterval,
)
from app.providers.base import BaseLLMProvider


class LocalNLPProvider(BaseLLMProvider):
    """
    Intelligent rule-based & regex natural language parser for tasks.
    Operates offline without requiring external API keys.
    """

    name: str = "local_nlp"

    # Category keyword mappings
    CATEGORY_KEYWORDS: Dict[TaskCategory, List[str]] = {
        TaskCategory.STUDY: [
            "study", "revise", "revision", "exam", "assignment", "homework",
            "test", "quiz", "lecture", "tutorial", "read", "chapter",
            "course", "syllabus", "java", "python", "dsa", "os", "operating system",
            "algorithm", "algorithms", "coding", "leetcode", "c++", "react",
            "math", "physics", "chemistry", "biology", "history", "notes", "prep"
        ],
        TaskCategory.WORK: [
            "meeting", "sprint", "client", "presentation", "report", "review",
            "project", "deploy", "email", "sync", "standup", "interview",
            "release", "pitch", "quarterly", "manager", "office", "pull request",
            "pr review", "client call", "demo", "proposal", "contract"
        ],
        TaskCategory.FITNESS: [
            "gym", "workout", "running", "run", "jogging", "cardio", "pushups",
            "pullups", "leg day", "yoga", "stretch", "exercise", "swim", "swimming",
            "cycling", "bike", "weights", "pilates", "crossfit", "treadmill"
        ],
        TaskCategory.HEALTH: [
            "doctor", "dentist", "medicine", "water", "sleep", "meditate",
            "meditation", "therapy", "pill", "pills", "hospital", "checkup",
            "hydration", "clinic", "appointment", "vitamins", "physio"
        ],
        TaskCategory.FINANCE: [
            "pay", "bill", "taxes", "electricity", "rent", "invoice", "salary",
            "bank", "credit card", "transfer", "budget", "dues", "fee",
            "insurance", "investment", "portfolio", "crypto", "dividend"
        ],
        TaskCategory.PERSONAL: [
            "grocery", "groceries", "cook", "dinner", "lunch", "breakfast",
            "clean", "cleaning", "laundry", "call mom", "call dad", "friend",
            "birthday", "party", "movie", "shopping", "haircut", "plan week",
            "plan my week", "vacation", "trip", "family", "package"
        ],
    }

    # Priority keywords
    PRIORITY_KEYWORDS: Dict[TaskPriority, List[str]] = {
        TaskPriority.CRITICAL: ["asap", "emergency", "critical", "urgent", "immediately", "right now"],
        TaskPriority.HIGH: ["high priority", "important", "must do", "crucial", "vital", "top priority"],
        TaskPriority.LOW: ["low priority", "when free", "someday", "optional", "casual", "if time", "whenever"],
    }

    # Day of week mapping
    DAY_NAMES = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6,
        "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6
    }

    DAY_TO_RRULE = {
        0: "MO", 1: "TU", 2: "WE", 3: "TH", 4: "FR", 5: "SA", 6: "SU"
    }

    async def parse_task(self, request: TaskParseRequest) -> TaskParseResponse:
        raw_text = request.text.strip()
        ref_dt = self._resolve_reference_datetime(request.referenceDate)

        # 1. Detect recurrence
        recurrence_info, text_no_rec = self._extract_recurrence(raw_text, ref_dt)

        # 2. Detect deadlines ("before Friday 5 PM", "by tomorrow 6pm", etc.)
        deadline_iso, deadline_matched_str = self._extract_deadline(text_no_rec, ref_dt)

        # 3. Detect date
        parsed_date, date_matched_str = self._extract_date(text_no_rec, ref_dt)

        # 4. Detect time (start time)
        parsed_time, time_matched_str = self._extract_time(text_no_rec)

        # 5. Detect duration
        duration_minutes, duration_matched_str = self._extract_duration(text_no_rec)

        # 6. Calculate end time if start time & duration exist
        start_time_str = parsed_time
        end_time_str = None
        if start_time_str and duration_minutes:
            end_time_str = self._calculate_end_time(start_time_str, duration_minutes)

        # 7. Detect Category
        category = self._detect_category(raw_text)

        # 8. Detect Priority
        priority = self._detect_priority(raw_text)

        # 9. Clean Title
        # Collect all extracted phrases to clean from title
        phrases_to_remove = [
            phrase for phrase in [
                recurrence_info.get("matched_str"),
                deadline_matched_str,
                date_matched_str,
                time_matched_str,
                duration_matched_str,
            ] if phrase
        ]
        title = self._clean_title(raw_text, phrases_to_remove)

        # 10. Generate Tags
        tags = self._generate_tags(raw_text, category, recurrence_info["is_recurring"])

        # Construct ParsedTask
        task = ParsedTask(
            title=title,
            date=parsed_date or recurrence_info.get("next_date"),
            time=start_time_str,
            startTime=start_time_str,
            endTime=end_time_str,
            duration=duration_minutes,
            category=category,
            priority=priority,
            isRecurring=recurrence_info["is_recurring"],
            recurrenceInterval=recurrence_info.get("interval"),
            recurrenceRule=recurrence_info.get("rrule"),
            deadline=deadline_iso,
            dueDate=parsed_date or recurrence_info.get("next_date"),
            notes=None,
            tags=tags,
        )

        return TaskParseResponse(
            intent="CREATE_TASK",
            confidence=0.92,
            task=task,
            rawInput=raw_text,
            providerUsed=self.name,
            explanation=f"Parsed via NLP rules into category={category.value}, priority={priority.value}",
        )

    def _resolve_reference_datetime(self, ref_date_str: Optional[str]) -> datetime:
        if ref_date_str:
            try:
                return date_parser.parse(ref_date_str)
            except Exception:
                pass
        return datetime.now()

    def _extract_recurrence(self, text: str, ref_dt: datetime) -> Tuple[Dict[str, Any], str]:
        """Detect recurrence patterns like 'every Sunday', 'every day', 'daily', etc."""
        rec_info = {
            "is_recurring": False,
            "interval": None,
            "rrule": None,
            "next_date": None,
            "matched_str": None,
        }

        # Check "every [day of week]"
        day_match = re.search(r'\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b', text, re.IGNORECASE)
        if day_match:
            day_str = day_match.group(1).lower()
            target_weekday = self.DAY_NAMES[day_str]
            days_ahead = (target_weekday - ref_dt.weekday() + 7) % 7
            if days_ahead == 0:
                days_ahead = 7
            next_date = (ref_dt + timedelta(days=days_ahead)).strftime("%Y-%m-%d")
            rrule_code = self.DAY_TO_RRULE[target_weekday]

            rec_info["is_recurring"] = True
            rec_info["interval"] = RecurrenceInterval.WEEKLY
            rec_info["rrule"] = f"FREQ=WEEKLY;BYDAY={rrule_code}"
            rec_info["next_date"] = next_date
            rec_info["matched_str"] = day_match.group(0)
            return rec_info, text

        # Check "every day" or "daily"
        daily_match = re.search(r'\b(every\s+day|daily)\b', text, re.IGNORECASE)
        if daily_match:
            rec_info["is_recurring"] = True
            rec_info["interval"] = RecurrenceInterval.DAILY
            rec_info["rrule"] = "FREQ=DAILY"
            rec_info["next_date"] = ref_dt.strftime("%Y-%m-%d")
            rec_info["matched_str"] = daily_match.group(0)
            return rec_info, text

        # Check "every week" or "weekly"
        weekly_match = re.search(r'\b(every\s+week|weekly)\b', text, re.IGNORECASE)
        if weekly_match:
            rec_info["is_recurring"] = True
            rec_info["interval"] = RecurrenceInterval.WEEKLY
            rec_info["rrule"] = "FREQ=WEEKLY"
            rec_info["next_date"] = (ref_dt + timedelta(days=7)).strftime("%Y-%m-%d")
            rec_info["matched_str"] = weekly_match.group(0)
            return rec_info, text

        # Check "every month" or "monthly"
        monthly_match = re.search(r'\b(every\s+month|monthly)\b', text, re.IGNORECASE)
        if monthly_match:
            rec_info["is_recurring"] = True
            rec_info["interval"] = RecurrenceInterval.MONTHLY
            rec_info["rrule"] = "FREQ=MONTHLY"
            rec_info["matched_str"] = monthly_match.group(0)
            return rec_info, text

        return rec_info, text

    def _extract_deadline(self, text: str, ref_dt: datetime) -> Tuple[Optional[str], Optional[str]]:
        """Detect expressions like 'before Friday 5 PM', 'by tomorrow 5 PM', 'due Friday'."""
        pattern = re.search(
            r'\b(?:before|by|due\s+by|due|deadline)\s+([a-zA-Z0-9\s:]+(?:am|pm|AM|PM)?)\b',
            text,
            re.IGNORECASE
        )
        if not pattern:
            return None, None

        deadline_phrase = pattern.group(1).strip()
        matched_str = pattern.group(0).strip()

        # Try to parse the target deadline phrase
        # Check if contains weekday or relative date + time
        parsed_d, _ = self._extract_date(deadline_phrase, ref_dt)
        parsed_t, _ = self._extract_time(deadline_phrase)

        if parsed_d and parsed_t:
            return f"{parsed_d}T{parsed_t}:00", matched_str
        elif parsed_d:
            return f"{parsed_d}T23:59:59", matched_str
        elif parsed_t:
            today_str = ref_dt.strftime("%Y-%m-%d")
            return f"{today_str}T{parsed_t}:00", matched_str

        return None, None

    def _extract_date(self, text: str, ref_dt: datetime) -> Tuple[Optional[str], Optional[str]]:
        """Extract explicit or relative date from text."""
        # 1. "day after tomorrow"
        if re.search(r'\bday\s+after\s+tomorrow\b', text, re.IGNORECASE):
            match = re.search(r'\bday\s+after\s+tomorrow\b', text, re.IGNORECASE)
            target = ref_dt + timedelta(days=2)
            return target.strftime("%Y-%m-%d"), match.group(0)

        # 2. "tomorrow"
        if re.search(r'\btomorrow\b', text, re.IGNORECASE):
            match = re.search(r'\btomorrow\b', text, re.IGNORECASE)
            target = ref_dt + timedelta(days=1)
            return target.strftime("%Y-%m-%d"), match.group(0)

        # 3. "today"
        if re.search(r'\btoday\b', text, re.IGNORECASE):
            match = re.search(r'\btoday\b', text, re.IGNORECASE)
            return ref_dt.strftime("%Y-%m-%d"), match.group(0)

        # 4. "next [weekday]" or "this [weekday]" or "[weekday]"
        weekday_match = re.search(
            r'\b(?:(next|this)\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b',
            text,
            re.IGNORECASE
        )
        if weekday_match:
            modifier = weekday_match.group(1)
            day_str = weekday_match.group(2).lower()
            target_weekday = self.DAY_NAMES[day_str]
            current_weekday = ref_dt.weekday()

            days_ahead = (target_weekday - current_weekday) % 7
            if modifier and modifier.lower() == "next":
                days_ahead = days_ahead + 7 if days_ahead <= 0 else days_ahead + 7
            elif days_ahead == 0:
                days_ahead = 7  # if today is Friday and user says "on Friday", assume next Friday

            target = ref_dt + timedelta(days=days_ahead)
            return target.strftime("%Y-%m-%d"), weekday_match.group(0)

        # 5. "in X days" / "in X weeks"
        rel_in_match = re.search(r'\bin\s+(\d+)\s+(day|days|week|weeks)\b', text, re.IGNORECASE)
        if rel_in_match:
            qty = int(rel_in_match.group(1))
            unit = rel_in_match.group(2).lower()
            delta = timedelta(days=qty) if "day" in unit else timedelta(weeks=qty)
            target = ref_dt + delta
            return target.strftime("%Y-%m-%d"), rel_in_match.group(0)

        # 6. Explicit dates: "2026-10-15" or "15th Oct" or "October 15"
        explicit_match = re.search(r'\b(\d{4}-\d{2}-\d{2})\b', text)
        if explicit_match:
            return explicit_match.group(1), explicit_match.group(0)

        # Month and Day, e.g. "Oct 15", "October 15", "15th October"
        month_day_match = re.search(
            r'\b(?:on\s+)?(?:(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*)\b',
            text,
            re.IGNORECASE
        )
        if month_day_match:
            try:
                date_phrase = month_day_match.group(0).replace("on", "").strip()
                parsed = date_parser.parse(date_phrase, default=ref_dt)
                return parsed.strftime("%Y-%m-%d"), month_day_match.group(0)
            except Exception:
                pass

        return None, None

    def _extract_time(self, text: str) -> Tuple[Optional[str], Optional[str]]:
        """Extract time in HH:MM (24-hour) format."""
        # 1. 12-hour format: "7 PM", "7:30 pm", "07:00 AM", "6:30am"
        # Match with optional "at" prefix
        match_12h = re.search(
            r'(?:\bat\s+)?(\b\d{1,2})(?::(\d{2}))?\s*(am|pm|AM|PM)\b',
            text
        )
        if match_12h:
            hours = int(match_12h.group(1))
            minutes = int(match_12h.group(2) or 0)
            meridiem = match_12h.group(3).upper()

            if meridiem == "PM" and hours != 12:
                hours += 12
            elif meridiem == "AM" and hours == 12:
                hours = 0

            formatted = f"{hours:02d}:{minutes:02d}"
            return formatted, match_12h.group(0)

        # 2. 24-hour format: "19:00", "07:30", "at 14:00"
        match_24h = re.search(r'(?:\bat\s+)?\b([01]?\d|2[0-3]):([0-5]\d)\b', text)
        if match_24h:
            hours = int(match_24h.group(1))
            minutes = int(match_24h.group(2))
            return f"{hours:02d}:{minutes:02d}", match_24h.group(0)

        # 3. Named times: "noon", "midnight", "morning", "afternoon", "evening", "night"
        named_times = {
            "noon": "12:00",
            "midnight": "00:00",
            "morning": "09:00",
            "afternoon": "14:00",
            "evening": "18:00",
            "night": "20:00",
        }
        for name, time_val in named_times.items():
            pattern = rf'(?:\bin\s+the\s+|\bat\s+)?\b{name}\b'
            named_match = re.search(pattern, text, re.IGNORECASE)
            if named_match:
                return time_val, named_match.group(0)

        return None, None

    def _extract_duration(self, text: str) -> Tuple[Optional[int], Optional[str]]:
        """Extract duration in minutes (e.g. 'for 1 hour', 'for 2 hours', '45 mins', '1.5h')."""
        # "for 1 hour and 30 minutes"
        combo_match = re.search(
            r'(?:\bfor\s+)?(\d+)\s*(?:hour|hours|hr|hrs|h)\s*(?:and\s*)?(\d+)\s*(?:minute|minutes|min|mins|m)\b',
            text,
            re.IGNORECASE
        )
        if combo_match:
            hours = int(combo_match.group(1))
            minutes = int(combo_match.group(2))
            return (hours * 60) + minutes, combo_match.group(0)

        # Hours: "for 1 hour", "for 2 hours", "1.5 hours", "2h", "1 hr"
        hours_match = re.search(
            r'(?:\bfor\s+)?(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs|h)\b',
            text,
            re.IGNORECASE
        )
        if hours_match:
            hours = float(hours_match.group(1))
            return int(hours * 60), hours_match.group(0)

        # Minutes: "for 45 minutes", "30 mins", "90 minutes", "15m"
        mins_match = re.search(
            r'(?:\bfor\s+)?(\d+)\s*(?:minute|minutes|min|mins|m)\b',
            text,
            re.IGNORECASE
        )
        if mins_match:
            return int(mins_match.group(1)), mins_match.group(0)

        return None, None

    def _calculate_end_time(self, start_time_str: str, duration_minutes: int) -> str:
        try:
            parts = start_time_str.split(":")
            h, m = int(parts[0]), int(parts[1])
            start_dt = datetime(2000, 1, 1, h, m)
            end_dt = start_dt + timedelta(minutes=duration_minutes)
            return end_dt.strftime("%H:%M")
        except Exception:
            return ""

    def _detect_category(self, text: str) -> TaskCategory:
        text_lower = text.lower()
        scored_categories: List[Tuple[TaskCategory, int]] = []

        for category, keywords in self.CATEGORY_KEYWORDS.items():
            score = 0
            for kw in keywords:
                if re.search(rf'\b{re.escape(kw)}\b', text_lower):
                    score += 1
            if score > 0:
                scored_categories.append((category, score))

        if scored_categories:
            scored_categories.sort(key=lambda x: x[1], reverse=True)
            return scored_categories[0][0]

        return TaskCategory.OTHER

    def _detect_priority(self, text: str) -> TaskPriority:
        text_lower = text.lower()
        for priority, keywords in self.PRIORITY_KEYWORDS.items():
            for kw in keywords:
                if re.search(rf'\b{re.escape(kw)}\b', text_lower):
                    return priority
        return TaskPriority.MEDIUM

    def _clean_title(self, raw_text: str, phrases_to_remove: List[str]) -> str:
        """Strip command wrappers, priority tags, and extracted entities to leave a pristine title."""
        title = raw_text

        # 1. Remove command phrases anywhere (e.g. at start or after 'Every Sunday')
        cmd_patterns = [
            r'\b(?:please\s+)?remind\s+me\s+to\b',
            r'\bcan\s+you\s+remind\s+me\s+to\b',
            r'\bi\s+need\s+to\b',
            r'\bi\s+have\s+to\b',
            r'\bdon\'t\s+forget\s+to\b',
            r'\bschedule\s+a\b',
            r'\bschedule\b',
            r'\bcreate\s+task\s+to\b',
            r'\badd\s+task\s+to\b',
            r'\badd\s+task\b',
            r'\bcreate\s+task\b',
        ]
        for cp in cmd_patterns:
            title = re.sub(cp, '', title, flags=re.IGNORECASE)

        # 2. Remove priority phrases from title
        priority_phrases = [
            r'\bhigh\s+priority\b', r'\blow\s+priority\b', r'\burgent\b',
            r'\basap\b', r'\bcritical\b', r'\btop\s+priority\b', r'\bimportant\b'
        ]
        for pp in priority_phrases:
            title = re.sub(pp, '', title, flags=re.IGNORECASE)

        # 3. Remove named time words if matched
        named_time_patterns = [r'\bmorning\b', r'\bafternoon\b', r'\bevening\b', r'\bnight\b', r'\bnoon\b', r'\bmidnight\b']
        for ntp in named_time_patterns:
            title = re.sub(rf'\b(?:in\s+the\s+|at\s+)?{ntp}', '', title, flags=re.IGNORECASE)

        # 4. Remove loose 'by end of month / week' phrases if present
        title = re.sub(r'\b(?:by|before)\s+end\s+of\s+(?:month|week|day)\b', '', title, flags=re.IGNORECASE)

        # 5. Remove each matched entity phrase
        for phrase in phrases_to_remove:
            if phrase:
                escaped = re.escape(phrase.strip())
                title = re.sub(rf'\b(?:at|for|on|by|before)\s+{escaped}\b', '', title, flags=re.IGNORECASE)
                title = re.sub(rf'\b{escaped}\b', '', title, flags=re.IGNORECASE)

        # 6. Clean up hanging prepositions / punctuation
        title = re.sub(r'\b(at|for|on|by|before|to)\s*$', '', title, flags=re.IGNORECASE)
        title = re.sub(r'^(?:at|for|on|by|before|to)\s+', '', title, flags=re.IGNORECASE)
        title = re.sub(r'[\.,;!?]+$', '', title)
        title = re.sub(r'\s+', ' ', title).strip()

        # If title became empty, fallback to the original prompt
        if not title:
            title = raw_text

        # Capitalize words nicely
        words = title.split()
        capitalized_words = []
        for i, w in enumerate(words):
            if w.upper() in ["DSA", "OS", "AI", "API", "PR", "UI", "UX", "SQL", "HTML", "CSS", "AWS"]:
                capitalized_words.append(w.upper())
            elif i > 0 and w.lower() in ["to", "and", "of", "for", "in", "on", "a", "an", "the", "my"]:
                capitalized_words.append(w.lower())
            else:
                capitalized_words.append(w.capitalize())

        return " ".join(capitalized_words)

    def _generate_tags(self, text: str, category: TaskCategory, is_recurring: bool) -> List[str]:
        tags = set()
        tags.add(category.value.lower())
        if is_recurring:
            tags.add("recurring")

        # Specific technology / topical keywords to tag
        tech_keywords = [
            "java", "python", "dsa", "os", "react", "c++", "leetcode", "algo",
            "gym", "meeting", "exam", "reading", "bill", "grocery"
        ]
        text_lower = text.lower()
        for kw in tech_keywords:
            if re.search(rf'\b{kw}\b', text_lower):
                tags.add(kw)

        return sorted(list(tags))
