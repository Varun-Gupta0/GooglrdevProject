from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from dotenv import load_dotenv
import os

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

import google.generativeai as genai
if API_KEY and API_KEY != "your_gemini_api_key":
    genai.configure(api_key=API_KEY)
    model = genai.GenerativeModel("gemini-2.0-flash")
else:
    model = None

from fastapi.middleware.cors import CORSMiddleware
import uuid
import pandas as pd
from typing import List, Optional
import json
import os
import google.generativeai as genai
from pydantic import BaseModel

class InsightRequest(BaseModel):
    fairness_score: float
    bias_contributors: list
    selection_rates: dict

from engines.ingestion import parse_csv, get_column_info
from engines.bias_engine import get_overall_scorecard
from engines.whatif_engine import run_whatif_simulation
from engines.autofix_engine import apply_autofix
from engines.ai_layer import get_ai_scorecard

app = FastAPI(title="EquiLens API")

# Enable CORS for frontend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store
# In a real app, this would be Redis or SQLite
sessions = {}

@app.get("/api/health")
def health_check():
    return {"status": "alive", "version": "1.0.0"}

@app.post("/api/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    protected_attributes: str = Form(...) # Expecting JSON string list
):
    try:
        content = await file.read()
        df = parse_csv(content)
        
        attrs = json.loads(protected_attributes)
        
        # Compute selection rates for protected attributes
        df[target_column] = pd.to_numeric(df[target_column], errors='coerce').fillna(0)
        selection_rates = {}
        for attr in attrs:
            if attr in df.columns:
                rates = df.groupby(attr)[target_column].mean().to_dict()
                selection_rates.update({f"{attr}_{str(k)}": round(v * 100, 2) for k, v in rates.items()})

        # Train model + run bias analysis
        scorecard, model_wrapper = get_ai_scorecard(df, target_column, attrs)

        if "error" in scorecard:
            raise HTTPException(status_code=400, detail=scorecard["error"])

        fairness_score = scorecard.get("overall_fairness_score", 0)

        # Build bias contributors from:
        # 1. Protected attribute disparate impact (real bias)
        # 2. ML feature importance (which features drive the model)
        attr_results = scorecard.get("bias_contributors", [])  # [{feature, score (fairness %), severity}]
        feature_importances = scorecard.get("model_importance", [])  # [{feature, importance}]

        # Map feature importance to a bias score (higher importance on a protected attr = more bias risk)
        importance_map = {fi["feature"]: fi["importance"] for fi in feature_importances}

        # For protected attrs: bias score = 100 - fairness_score (inverted: low fairness = high bias)
        protected_contributors = [
            {
                "feature": c["feature"].capitalize(),
                "score": round(100 - c["score"], 2),
                "severity": c["severity"]
            }
            for c in attr_results
        ]

        # For all other features: bias score = importance * 100 (proxy for influence)
        other_contributors = [
            {
                "feature": fi["feature"].capitalize(),
                "score": round(fi["importance"] * 100, 2),
                "severity": "HIGH" if fi["importance"] > 0.3 else "MEDIUM" if fi["importance"] > 0.15 else "LOW"
            }
            for fi in feature_importances
            if fi["feature"] not in [c["feature"] for c in attr_results]
        ]

        # Merge and sort by score descending (most biased first)
        bias_contributors = sorted(
            protected_contributors + other_contributors,
            key=lambda x: x["score"],
            reverse=True
        )

        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "df": df,
            "target": target_column,
            "protected_attrs": attrs,
            "scorecard": scorecard,
            "model": model_wrapper
        }

        response = {
            "session_id": session_id,
            "fairness_score": round(fairness_score, 2),
            "selection_rates": selection_rates,
            "bias_contributors": bias_contributors,
            "xp_awarded": 50,
            "group_fairness": scorecard.get("group_fairness", []),
            "intersectionality": scorecard.get("intersectionality", None),
            "accuracy": scorecard.get("accuracy_proxy", 60),
            "stability": scorecard.get("stability_index", 50)
        }
        print(f"[EquiLens] Upload OK | fairness={fairness_score} | contributors={len(bias_contributors)} | session={session_id}")
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/scorecard/{session_id}")
async def get_scorecard(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return session["scorecard"]

@app.post("/api/whatif")
async def whatif_simulation(
    session_id: str = Form(...),
    weights: str = Form(...) # JSON string dict
):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    weight_dict = {k: float(v) / 100 for k, v in json.loads(weights).items()}
    
    new_scorecard = run_whatif_simulation(
        session["df"], 
        session["target"], 
        session["protected_attrs"],
        weight_dict
    )
    
    return {
        "fairness_score": new_scorecard["overall_fairness_score"],
        "risk_level": new_scorecard["overall_risk_level"],
        "scorecard": new_scorecard,
        "xp_awarded": 100
    }

@app.post("/api/autofix")
async def autofix_data(
    session_id: str = Form(...)
):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    
    result = apply_autofix(
        session["df"], 
        session["target"], 
        session["protected_attrs"]
    )
    
    # Update session with fixed data and new scorecard
    session["df"] = result["fixed_df"]
    session["scorecard"] = result["scorecard"]
    
    return {
        "before": session["scorecard"]["overall_fairness_score"], # This is simplified
        "after": result["scorecard"]["overall_fairness_score"],
        "changes_applied": result["changes_applied"],
        "scorecard": result["scorecard"],
        "xp_awarded": 500
    }

@app.post("/api/simulate")
async def simulate_params(
    gender:  float = Form(default=74),
    balance: float = Form(default=30),
    thresh:  float = Form(default=42),
    age:     float = Form(default=60),
    race:    float = Form(default=70),
):
    """
    Pure-math simulation endpoint — mirrors the frontend formula exactly.
    Accepts the 5 slider parameters and returns a scorecard.
    No session/ML required; works even before a CSV is uploaded.
    """
    import math
    f = max(5, min(95, round(100 - (gender * 0.4 + (100 - balance) * 0.3 + (100 - thresh) * 0.2 + age * 0.05 + race * 0.05))))
    a = max(40, min(94, round(55 + balance * 0.2 + thresh * 0.1 - gender * 0.05)))
    b = max(5, min(95, round(100 - f * 0.8)))
    s = max(5, min(95, round(f * 0.65 + thresh * 0.25)))

    risk = 'LOW' if f >= 75 else ('HIGH' if f >= 50 else 'CRITICAL')

    contributors = sorted([
        {"feature": "Gender",  "score": round(gender * 0.9)},
        {"feature": "Race",    "score": round(race * 0.85)},
        {"feature": "Zip",     "score": round((100 - balance) * 0.7)},
        {"feature": "Age",     "score": round(age * 0.75)},
        {"feature": "Name",    "score": round(race * 0.5)},
        {"feature": "Income",  "score": 45},
        {"feature": "History", "score": 38},
        {"feature": "Region",  "score": round((100 - balance) * 0.5)},
        {"feature": "Score",   "score": int(thresh)},
        {"feature": "Edu",     "score": 35},
    ], key=lambda x: -x["score"])

    group_fairness = [
        {"name": "Male",   "fairness": min(95, round(f + (100 - gender) * 0.12))},
        {"name": "Female", "fairness": max(5,  round(f - gender * 0.22 + 12))},
        {"name": "18-30",  "fairness": min(95, round(f + (100 - age) * 0.1))},
        {"name": "55+",    "fairness": max(5,  round(f - age * 0.18 + 8))},
        {"name": "Urban",  "fairness": min(95, round(f + balance * 0.08))},
        {"name": "Rural",  "fairness": max(5,  round(f - balance * 0.12 + 5))},
    ]

    return {
        "overall_fairness_score": f,
        "accuracy_proxy": a,
        "bias_index": b,
        "stability_index": s,
        "overall_risk_level": risk,
        "bias_contributors": contributors,
        "group_fairness": group_fairness,
        "intersectionality": {
            "attr_x": "age", "attr_y": "gender",
            "labels_x": ["18-30", "31-54", "55+"],
            "labels_y": ["Male", "Female", "NB"],
            "data": [
                [min(95, f + 20), max(5, f - 5),  min(95, f + 10)],
                [max(5, f - 25),  max(5, f - 30), max(5, f - 35)],
                [min(95, f + 15), max(5, f - 10), min(95, f + 5)],
            ],
        },
    }

def get_ai_insights(prompt):
    if not model:
        print("Gemini Error: API Key not configured properly.")
        return None
        
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Remove markdown if present
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]

        return json.loads(text)

    except Exception as e:
        print("Gemini Error:", str(e))
        return None

@app.post("/api/ai-insights")
async def ai_insights_endpoint(req: InsightRequest):
    print("AI endpoint hit")
    print("API KEY:", API_KEY)
    
    prompt = f"""
    You are an expert AI fairness auditor. Analyze the following model metrics and provide a JSON response.
    
    Fairness Score: {req.fairness_score}/100
    Bias Contributors: {json.dumps(req.bias_contributors)}
    Selection Rates: {json.dumps(req.selection_rates)}
    
    Return ONLY a JSON object with this exact structure:
    {{
      "diagnosis": "A concise paragraph diagnosing the severity and primary driver of the bias.",
      "cause": "A concise paragraph explaining the root cause based on the features and selection rates.",
      "suggestions": [
         {{
           "instruction": "Actionable instruction (e.g. Reduce Gender Influence)",
           "reason": "Why this helps",
           "mechanism": "How it works mathematically"
         }}
      ]
    }}
    """
    
    print("PROMPT:", prompt)
    
    result = get_ai_insights(prompt)
    print("Gemini response:", result)
    
    if result is not None:
        return result
    else:
        # Fallback output
        return {
            "diagnosis": "AI Engine Offline. Relying on standard metrics.",
            "cause": "Gemini API is unavailable or missing configuration.",
            "suggestions": [
                {
                    "instruction": "Review Metrics Manually",
                    "reason": "AI automated analysis is disabled.",
                    "mechanism": "Manual review of selection rates and contributors."
                }
            ]
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

