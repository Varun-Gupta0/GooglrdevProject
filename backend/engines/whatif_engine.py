import pandas as pd
import numpy as np
from typing import Dict, List, Any
from .bias_engine import get_overall_scorecard

def run_whatif_simulation(
    df: pd.DataFrame, 
    target_column: str, 
    protected_attributes: List[str],
    weights: Dict[str, float]
) -> Dict[str, Any]:
    """
    Simulates fairness changes by adjusting the probability of positive outcomes
    based on feature weights. 
    weights: dict of {attribute: weight_factor (0.0 to 2.0)}
    1.0 is no change. 0.0 is zero influence (fairer). 2.0 is double influence (more biased).
    """
    sim_df = df.copy()
    
    # Simple simulation logic: 
    # If weight < 1.0, we move minority samples towards positive outcomes
    # If weight > 1.0, we move majority samples towards positive outcomes
    
    for attr, weight in weights.items():
        if attr not in protected_attributes:
            continue
            
        rates = sim_df.groupby(attr)[target_column].mean().to_dict()
        if not rates: continue
        
        majority_group = max(rates, key=rates.get)
        minority_group = min(rates, key=rates.get)
        
        if weight < 1.0:
            # Shift minority towards positive
            # Improvement factor
            factor = (1.0 - weight) * 0.5 # Max 50% shift
            mask = (sim_df[attr] == minority_group) & (sim_df[target_column] == 0)
            # Randomly flip some 0s to 1s
            flip_count = int(mask.sum() * factor)
            if flip_count > 0:
                indices = sim_df[mask].sample(n=flip_count).index
                sim_df.loc[indices, target_column] = 1
        
        elif weight > 1.0:
            # Shift majority towards positive (increase bias)
            factor = (weight - 1.0) * 0.5
            mask = (sim_df[attr] == majority_group) & (sim_df[target_column] == 0)
            flip_count = int(mask.sum() * factor)
            if flip_count > 0:
                indices = sim_df[mask].sample(n=flip_count).index
                sim_df.loc[indices, target_column] = 1

    return get_overall_scorecard(sim_df, target_column, protected_attributes)
