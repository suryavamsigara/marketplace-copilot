"""
AI Copilot orchestration: React frontend -> FastAPI -> this service -> LLM API.

The LLM is given a set of 4 high-density, read-only tools backed by the deterministic
analytics/opportunity engines. It calls at most 1-2 tools to gather real evidence, then
produces a structured, evidence-grounded answer.
"""
import json
from typing import Optional
from sqlalchemy.orm import Session
from app.config import LLM_API_KEY, LLM_MODEL
from app.ai.tools import TOOL_SCHEMAS, call_tool
from app.services.analytics_engine import AnalyticsEngine
from app.services import opportunity_engine as oe

SYSTEM_PROMPT = """You are the Marketplace Performance Copilot — an expert AI operations analyst embedded in an internal marketplace BI tool.

CRITICAL EFFICIENCY & TOOL SELECTION RULES:
1. Tool Calling Budget: Call at most 1 to 2 tools per response. NEVER call multiple tools in a loop when one tool satisfies the question.
2. Tool Routing Guide:
   - For general health, "what changed", revenue declines, or period comparisons -> Call `get_executive_overview(days=30)`. (This single tool already contains KPIs, channel growth, and trend data!).
   - For channel-specific performance (Amazon, Myntra, Flipkart, Ajio) -> Call `get_marketplace_performance(marketplace="...")`.
   - For SKU, catalog, inventory, or stock-out lookups -> Call `get_product_intelligence(query="..." or risk_status="Critical")`.
   - For actionable business tasks, risks, pricing gaps, return spikes, or opportunities -> Call `get_prioritized_opportunities()`.
3. Strict Grounding: Every metric, number, and percentage in your response MUST come from the tool output. Never hallucinate or calculate ungrounded numbers.
4. Grounded Reasoning: Distinguish observed metrics from hypotheses. State likely explanations and concrete next steps.

Format your response in clean Markdown with these sections:
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
        # Max 2 tool-calling iterations to enforce lean latency
        for _ in range(2):
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
                max_tokens=1000,
            )
            choice = resp.choices[0]
            msg = choice.message

            if msg.tool_calls:
                messages.append({
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [tc.model_dump() for tc in msg.tool_calls],
                })
                for tc in msg.tool_calls:
                    args = json.loads(tc.function.arguments or "{}")
                    result = call_tool(tc.function.name, args, db=db, engine=eng)
                    tool_call_log.append({"tool": tc.function.name, "args": args})
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result, default=str)[:5000],
                    })
                continue

            return {"answer": msg.content, "mode": "llm", "tool_calls": tool_call_log}

        # If 2 iterations completed and final content available:
        final_resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            max_tokens=1000,
        )
        return {
            "answer": final_resp.choices[0].message.content,
            "mode": "llm",
            "tool_calls": tool_call_log,
        }

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