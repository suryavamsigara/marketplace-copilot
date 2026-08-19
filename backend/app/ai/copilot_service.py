"""
AI Copilot orchestration: React frontend -> FastAPI -> this service -> LLM API.

Architectural Separation:
1. Chat Mode (Interactive Natural Language):
   - Uses CHAT_SYSTEM_PROMPT with access to 4 essential tools.
   - Executes dynamic tool calls (budgeted to 1-2 calls max) to fetch live data.
2. Explain Mode (Deterministic Deep-Dive & Streaming Justification):
   - Uses EXPLAIN_SYSTEM_PROMPT.
   - Pre-injects complete deterministic metrics, evidence, and unit economics into prompt.
   - Streams tokens directly to client in real-time for zero perceived latency.
"""
import json
from typing import Optional, Dict, Any, List, Generator
from sqlalchemy.orm import Session
from app.config import LLM_API_KEY, LLM_MODEL
from app.ai.tools import TOOL_SCHEMAS, call_tool
from app.services.analytics_engine import AnalyticsEngine
from app.services import opportunity_engine as oe
from app.models.models import Opportunity

CHAT_SYSTEM_PROMPT = """You are the Marketplace Performance Copilot — an expert AI operations analyst embedded in an internal marketplace BI tool.

CRITICAL EFFICIENCY & TOOL SELECTION RULES:
1. Tool Calling Budget: Call at most 1 to 2 tools per response. NEVER call redundant tools.
2. Tool Routing:
   - For general health, "what changed", revenue drops, or overview -> Call `get_executive_overview(days=30)`.
   - For channel-specific performance (Amazon, Myntra, Flipkart, Ajio) -> Call `get_marketplace_performance(marketplace="...")`.
   - For SKU, catalog, inventory, or stock-out lookups -> Call `get_product_intelligence(query="..." or risk_status="Critical")`.
   - For actionable business tasks, risks, pricing gaps, return spikes, or opportunities -> Call `get_prioritized_opportunities()`.
3. Strict Grounding: Every metric, number, and percentage in your response MUST come from the tool output. Never hallucinate ungrounded numbers.
4. Grounded Reasoning: Distinguish observed metrics from hypotheses. State likely explanations and concrete next steps.

Format your response in clean Markdown with these sections:
## Summary
## Main Drivers
## Evidence
## Recommended Actions
## Estimated Impact
## Confidence
"""

EXPLAIN_SYSTEM_PROMPT = """You are the Marketplace Diagnostic Engine — an expert AI operations analyst explaining a specific KPI, SKU risk, or business opportunity.

RULES:
1. Direct Analysis: All factual metrics and evidence have been pre-computed by the deterministic analytics engine and provided in your prompt.
2. Structure: Break down the root cause, business exposure, and operational justification.
3. Tone: Executive, concise, and highly actionable.

Format your explanation in clean Markdown with these sections:
## Root Cause Diagnosis
## Business Impact & Exposure
## Supporting Evidence
## Recommended Next Steps
## Confidence Justification
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
    """Handles open-ended conversational questions with tool-calling capabilities."""
    eng = engine or AnalyticsEngine(db, days=30)
    if not LLM_API_KEY:
        return _deterministic_fallback(db, message, engine=eng)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=LLM_API_KEY, base_url='https://api.deepseek.com', timeout=20.0)

        messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        for h in (history or [])[-6:]:
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        tool_call_log = []
        for _ in range(2):  # Max 2 tool-calling iterations
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                tools=TOOL_SCHEMAS,
                tool_choice="auto",
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

            answer = (msg.content or "").strip()
            return {"answer": answer, "mode": "llm", "tool_calls": tool_call_log}

        final_resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
        )
        final_msg = final_resp.choices[0].message
        final_answer = (final_msg.content or "").strip()

        return {
            "answer": final_answer,
            "mode": "llm",
            "tool_calls": tool_call_log,
        }

    except Exception as e:
        fb = _deterministic_fallback(db, message, engine=eng)
        fb["error"] = f"AI analysis unavailable ({type(e).__name__}); showing deterministic fallback."
        return fb


def _get_explain_prompt(db: Session, subject_type: str, subject_id: Optional[str], eng: AnalyticsEngine) -> str:
    """Builds the comprehensive deterministic prompt context for the explain engine."""
    # 1. Opportunity Explain
    if subject_type == "opportunity" and subject_id:
        try:
            opp_id = int(subject_id)
            o = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
        except Exception:
            o = None

        if o:
            try:
                ev_list = json.loads(o.evidence) if isinstance(o.evidence, str) else o.evidence
            except Exception:
                ev_list = [str(o.evidence)]
            ev_str = "\n- ".join(ev_list) if ev_list else "None"

            return (
                f"Explain and justify this prioritized business opportunity:\n\n"
                f"**Opportunity Title:** {o.title}\n"
                f"**Category/Type:** {o.opportunity_type}\n"
                f"**Priority Score:** {o.score}/100 ({o.severity} severity, {o.confidence} confidence)\n"
                f"**Supporting Evidence:**\n- {ev_str}\n"
                f"**Estimated Impact / Exposure:** {o.impact}\n"
                f"**Deterministic Recommended Action:** {o.recommendation}\n\n"
                f"Please explain why this issue occurred, quantify the operational/revenue risk, and justify the concrete action steps to resolve it."
            )

    # 2. SKU / Product Explain
    if subject_type == "kpi" and str(subject_id).startswith("product_"):
        pid = int(str(subject_id).replace("product_", ""))
        p_detail = eng.product_detail(product_id=pid)
        if p_detail:
            return (
                f"Explain SKU performance and inventory health for this product:\n\n"
                f"**Product:** {p_detail['name']} (SKU: {p_detail['sku']}, Category: {p_detail['category']})\n"
                f"**Price:** ₹{p_detail['price']:,.2f} | **Unit Cost:** ₹{p_detail['cost']:,.2f} | **Margin:** {p_detail['margin_pct']}%\n"
                f"**Period Revenue:** ₹{p_detail['revenue']:,.2f} | **Units Sold:** {p_detail['units_sold']} units\n"
                f"**Conversion Rate:** {p_detail['conversion_rate']}% | **Return Rate:** {p_detail['return_rate']}%\n"
                f"**Current Inventory:** {p_detail['inventory']} units | **Sales Velocity:** {p_detail['sales_velocity']} units/day\n"
                f"**Days of Inventory Remaining:** {p_detail['days_of_stock']} days\n"
                f"**Estimated Revenue at Risk:** ₹{p_detail['revenue_at_risk']:,.2f}\n\n"
                f"Provide a root-cause explanation for velocity, inventory depletion trajectory, and priority merchandising action."
            )

    # 3. Marketplace Explain
    if subject_type == "kpi" and str(subject_id).startswith("marketplace_"):
        mkt_name = str(subject_id).replace("marketplace_", "").capitalize()
        mkt_detail = eng.marketplace_detail(marketplace_name=mkt_name)
        if mkt_detail:
            m = mkt_detail.get("marketplace", {})
            return (
                f"Diagnose channel performance for **{mkt_name}**:\n\n"
                f"**Revenue:** ₹{m.get('revenue', 0):,.2f} ({m.get('revenue_growth_pct', 0):+.1f}% period-over-period)\n"
                f"**Revenue Share:** {m.get('revenue_contribution_pct', 0)}% of total catalog\n"
                f"**Orders:** {m.get('orders', 0):,} | **Conversion Rate:** {m.get('conversion_rate', 0)}%\n"
                f"**Return Rate:** {m.get('return_rate', 0)}% | **Channel Health:** {m.get('health', 'Healthy')}\n"
                f"**Stockout Risk SKUs:** {m.get('stockout_risk_products', 0)} products\n\n"
                f"Explain channel performance drivers, conversion momentum, and channel-specific operational steps."
            )

    # 4. General KPI Explain
    kpi_name = subject_id or "revenue"
    summary = eng.dashboard_summary()
    kpis = summary.get("kpis", {})
    kpi_obj = kpis.get(kpi_name, {})
    mkts = eng.marketplace_metrics()

    mkt_summary_str = "\n".join([
        f"- {m['marketplace']}: ₹{m['revenue']:,.0f} ({m['revenue_growth_pct']:+.1f}% growth, {m['return_rate']}% returns)"
        for m in mkts
    ])

    return (
        f"Explain what changed for the **{kpi_name.upper()}** KPI over the last {eng.days} days:\n\n"
        f"**Current Value:** {kpi_obj.get('value', 0)}\n"
        f"**Previous Period Value:** {kpi_obj.get('previous', 0)}\n"
        f"**Period-over-Period Change:** {kpi_obj.get('change_pct', 0):+.2f}%\n\n"
        f"**Channel Performance Context:**\n{mkt_summary_str}\n\n"
        f"Provide a root-cause explanation: what changed, main channel/product contributors, and recommended operational priorities."
    )


def explain_stream(
    db: Session,
    subject_type: str,
    subject_id: Optional[str] = None,
    engine: Optional[AnalyticsEngine] = None,
) -> Generator[str, None, None]:
    """
    Streams explanation tokens in real-time directly from LLM API.
    """
    eng = engine or AnalyticsEngine(db, days=30)
    prompt_context = _get_explain_prompt(db, subject_type, subject_id, eng)

    if not LLM_API_KEY:
        fb = _deterministic_fallback(db, prompt_context, engine=eng)
        yield fb.get("answer", "")
        return

    try:
        from openai import OpenAI
        client = OpenAI(api_key=LLM_API_KEY, base_url='https://api.deepseek.com', timeout=30.0)

        messages = [
            {"role": "system", "content": EXPLAIN_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_context},
        ]

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.3,
            stream=True,
        )

        has_output = False
        for chunk in response:
            if not chunk.choices:
                continue
            delta = chunk.choices[0].delta
            # Only stream final output content (exclude internal model reasoning/thinking tokens)
            token = getattr(delta, "content", None) or ""
            if token:
                has_output = True
                yield token

        if not has_output:
            fb = _deterministic_fallback(db, prompt_context, engine=eng)
            yield fb.get("answer", "")

    except Exception:
        fb = _deterministic_fallback(db, prompt_context, engine=eng)
        yield fb.get("answer", "")


def explain(db: Session, subject_type: str, subject_id: str = None, engine: Optional[AnalyticsEngine] = None) -> dict:
    """Non-streaming fallback helper."""
    eng = engine or AnalyticsEngine(db, days=30)
    prompt_context = _get_explain_prompt(db, subject_type, subject_id, eng)

    if not LLM_API_KEY:
        return _deterministic_fallback(db, prompt_context, engine=eng)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=LLM_API_KEY, base_url='https://api.deepseek.com', timeout=20.0)

        messages = [
            {"role": "system", "content": EXPLAIN_SYSTEM_PROMPT},
            {"role": "user", "content": prompt_context},
        ]

        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.3,
        )

        msg = resp.choices[0].message
        answer = (msg.content or "").strip()

        if not answer:
            return _deterministic_fallback(db, prompt_context, engine=eng)

        return {
            "answer": answer,
            "mode": "llm",
            "tool_calls": [],
        }
    except Exception as e:
        fb = _deterministic_fallback(db, prompt_context, engine=eng)
        fb["error"] = f"AI analysis unavailable ({type(e).__name__}); showing deterministic fallback."
        return fb