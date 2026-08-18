"""
AI Copilot orchestration: React frontend -> FastAPI -> this service -> LLM API.

The LLM is given a set of read-only tools backed by the deterministic
analytics/opportunity engines. It calls tools to gather real evidence, then
produces a structured, evidence-grounded answer. If no LLM_API_KEY is
configured (or the call fails), the copilot falls back to a deterministic
summary built directly from the analytics/opportunity engines, and the
response clearly states that AI reasoning is unavailable.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.config import LLM_API_KEY, LLM_MODEL
from app.ai.tools import TOOL_SCHEMAS, call_tool
from app.services.analytics_engine import AnalyticsEngine
from app.services import opportunity_engine as oe

SYSTEM_PROMPT = """You are an internal marketplace business analyst embedded in the \
Marketplace Performance Copilot product.

Rules:
1. Only use data returned by the provided tools. Never invent metrics.
2. Explain findings using evidence pulled from tool results.
3. Distinguish observations (what the data shows) from hypotheses (what might explain it).
4. Do not claim causation unless the data clearly establishes it - otherwise say \
"likely contributor" or "requires investigation".
5. Prioritize recommendations by business impact and urgency.
6. State important assumptions explicitly (e.g. revenue-at-risk is an estimate, not a forecast).
7. Be concise but useful - prefer specifics over generic advice.
8. Always give specific, actionable next steps.
9. If the available data is insufficient to answer, say so plainly instead of guessing.

Format your final answer in this structure using Markdown headings:
## Summary
## Main Drivers
## Evidence
## Recommended Actions
## Estimated Impact
## Confidence
"""


def _deterministic_fallback(db: Session, question: str, engine: Optional[AnalyticsEngine] = None) -> dict:
    """Non-LLM fallback: builds a grounded answer directly from the
    analytics/opportunity engines when no LLM API key is configured."""
    eng = engine or AnalyticsEngine(db, days=30)
    summary = eng.dashboard_summary()
    opps = oe.detect_all_opportunities(db, days=30)[:5]
    rev = summary["kpis"]["revenue"]

    lines = []
    lines.append("## Summary")
    direction = "grew" if rev["change_pct"] >= 0 else "declined"
    lines.append(f"Revenue {direction} {abs(rev['change_pct'])}% vs the previous period (₹{rev['value']:,.0f}).")
    lines.append("\n## Main Drivers")
    for o in opps[:3]:
        lines.append(f"- {o['title']} (score {o['score']})")
    lines.append("\n## Evidence")
    for o in opps[:3]:
        for e in o["evidence"][:2]:
            lines.append(f"- {e}")
    lines.append("\n## Recommended Actions")
    for o in opps[:3]:
        lines.append(f"- {o['recommendation']}")
    lines.append("\n## Estimated Impact")
    lines.append("See individual opportunity cards for estimated revenue exposure.")
    lines.append("\n## Confidence")
    lines.append("Medium (deterministic fallback mode - AI reasoning layer unavailable; "
                  "this response is generated directly from the analytics engine without LLM synthesis).")
    return {
        "answer": "\n".join(lines),
        "mode": "fallback",
        "tool_calls": [],
    }


def chat(db: Session, message: str, history: list = None, engine: Optional[AnalyticsEngine] = None) -> dict:
    eng = engine or AnalyticsEngine(db, days=30)
    if not LLM_API_KEY:
        return _deterministic_fallback(db, message, engine=eng)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=LLM_API_KEY, base_url='https://api.deepseek.com')

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in (history or [])[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        tool_call_log = []
        for _ in range(5):  # bounded tool-calling loop
            resp = client.chat.completions.create(
                model=LLM_MODEL, messages=messages, tools=TOOL_SCHEMAS, tool_choice="auto",
                max_tokens=1200,
            )
            choice = resp.choices[0]
            msg = choice.message

            if msg.tool_calls:
                messages.append({
                    "role": "assistant", "content": msg.content or "",
                    "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
                })
                for tc in msg.tool_calls:
                    args = json.loads(tc.function.arguments or "{}")
                    result = call_tool(tc.function.name, args, db=db, engine=eng)
                    tool_call_log.append({"tool": tc.function.name, "args": args})
                    messages.append({
                        "role": "tool", "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str)[:6000],
                    })
                continue

            return {"answer": msg.content, "mode": "llm", "tool_calls": tool_call_log}

        return {"answer": "I gathered evidence but couldn't finalize a response in time. Please try again.",
                "mode": "llm", "tool_calls": tool_call_log}
    except Exception as e:
        fb = _deterministic_fallback(db, message, engine=eng)
        fb["error"] = f"AI analysis unavailable ({type(e).__name__}); showing deterministic fallback."
        return fb


def explain(db: Session, subject_type: str, subject_id: str = None, engine: Optional[AnalyticsEngine] = None) -> dict:
    """Powers the 'Explain' button on KPI cards and opportunity cards."""
    eng = engine or AnalyticsEngine(db, days=30)
    if subject_type == "opportunity" and subject_id:
        from app.models.models import Opportunity
        o = db.query(Opportunity).get(int(subject_id))
        if not o:
            return {"answer": "Opportunity not found.", "mode": "fallback"}
        question = f"Explain this opportunity in detail and justify the recommended action: {o.title}."
        return chat(db, question, engine=eng)

    if subject_type == "kpi" and subject_id:
        question = f"Explain what changed for the KPI '{subject_id}' over the last 30 days: what changed, main contributors, evidence, likely explanation, and recommended action."
        return chat(db, question, engine=eng)

    return chat(db, "What changed this week and what should I prioritize?", engine=eng)