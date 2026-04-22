import pandas as pd
import numpy as np
from typing import Dict, List, Any

def calculate_disparate_impact(df: pd.DataFrame, target_column: str, protected_attribute: str) -> Dict[str, Any]:
    """
    Calculates disparate impact ratio and selection rates for a given protected attribute.
    Formula: (Selection Rate Minority) / (Selection Rate Majority)
    """
    if protected_attribute not in df.columns or target_column not in df.columns:
        return {"error": f"Columns {protected_attribute} or {target_column} not found"}

    # Ensure target is numeric/binary
    df[target_column] = pd.to_numeric(df[target_column], errors='coerce').fillna(0)
    
    # Calculate selection rates for each group
    rates = df.groupby(protected_attribute)[target_column].mean().to_dict()
    
    if not rates:
        return {"error": "No data found for groups"}

    # Identify majority and minority groups based on selection rate
    # For a hackathon, we can also define minority as the group with the lowest rate
    groups = list(rates.keys())
    values = list(rates.values())
    
    majority_group = groups[np.argmax(values)]
    minority_group = groups[np.argmin(values)]
    
    majority_rate = rates[majority_group]
    minority_rate = rates[minority_group]
    
    di_ratio = minority_rate / majority_rate if majority_rate > 0 else 1.0
    
    # Fairness Score (0-100)
    # Using 0.8 as the fair threshold (80% rule)
    fairness_score = min(100, max(0, di_ratio * 100))
    
    return {
        "attribute": protected_attribute,
        "fairness_score": round(fairness_score, 2),
        "disparate_impact_ratio": round(di_ratio, 4),
        "selection_rates": {str(k): round(v, 4) for k, v in rates.items()},
        "majority_group": str(majority_group),
        "minority_group": str(minority_group),
        "risk_level": "LOW" if di_ratio >= 0.9 else "MEDIUM" if di_ratio >= 0.8 else "HIGH" if di_ratio >= 0.6 else "CRITICAL"
    }

def get_overall_scorecard(df: pd.DataFrame, target_column: str, protected_attributes: List[str]) -> Dict[str, Any]:
    results = []
    for attr in protected_attributes:
        res = calculate_disparate_impact(df, target_column, attr)
        if "error" not in res:
            results.append(res)
    
    if not results:
        return {"error": "No valid analysis performed"}
    
    avg_fairness = np.mean([r['fairness_score'] for r in results])
    
    # Bias contributors (DNA Cloud data)
    contributors = [
        {"feature": r['attribute'], "score": r['fairness_score'], "severity": r['risk_level']}
        for r in results
    ]
    
    # Sort by lowest fairness score (highest bias)
    contributors = sorted(contributors, key=lambda x: x['score'])
    
    overall_risk = "LOW"
    if any(r['risk_level'] == "CRITICAL" for r in results): overall_risk = "CRITICAL"
    elif any(r['risk_level'] == "HIGH" for r in results): overall_risk = "HIGH"
    elif any(r['risk_level'] == "MEDIUM" for r in results): overall_risk = "MEDIUM"

    # Calculate real stability (how consistent fairness is across different attributes)
    fairness_variance = np.std([r['fairness_score'] for r in results])
    stability_index = max(0, min(100, 100 - (fairness_variance * 0.5)))
    
    # Calculate an accuracy proxy based on the majority class distribution (imbalance)
    # This represents the "baseline" accuracy if you just predicted the majority outcome
    target_mean = df[target_column].mean()
    accuracy_proxy = max(target_mean, 1 - target_mean) * 100

    return {
        "overall_fairness_score": round(avg_fairness, 2),
        "overall_risk_level": overall_risk,
        "attribute_results": results,
        "bias_contributors": contributors,
        "accuracy_proxy": round(accuracy_proxy, 2),
        "stability_index": round(stability_index, 2),
        "group_fairness": get_group_fairness_data(df, target_column, protected_attributes),
        "intersectionality": get_intersectionality_matrix(df, target_column, protected_attributes[:2]) if len(protected_attributes) >= 2 else None
    }

def get_group_fairness_data(df: pd.DataFrame, target_column: str, protected_attributes: List[str]) -> List[Dict[str, Any]]:
    """Flattened data for the bar chart across all groups."""
    data = []
    for attr in protected_attributes:
        rates = df.groupby(attr)[target_column].mean().to_dict()
        for group, rate in rates.items():
            data.append({
                "name": str(group),
                "attribute": attr,
                "fairness": round(rate * 100, 2)
            })
    return data

def get_intersectionality_matrix(df: pd.DataFrame, target_column: str, attrs: List[str]) -> Dict[str, Any]:
    """Calculates selection rates at the intersection of two attributes."""
    if len(attrs) < 2:
        return {}
    
    attr1, attr2 = attrs[0], attrs[1]
    
    # Pivot table for selection rates
    pivot = df.pivot_table(
        index=attr1, 
        columns=attr2, 
        values=target_column, 
        aggfunc='mean'
    ).fillna(0)
    
    # Convert to JSON friendly format
    matrix = pivot.values.tolist()
    labels_x = [str(c) for c in pivot.columns]
    labels_y = [str(r) for r in pivot.index]
    
    return {
        "attr_x": attr2,
        "attr_y": attr1,
        "labels_x": labels_x,
        "labels_y": labels_y,
        "data": [[round(val * 100, 2) for val in row] for row in matrix]
    }
