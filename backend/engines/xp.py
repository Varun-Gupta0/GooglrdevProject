from typing import List, Dict, Any

# Milestone definitions
MILESTONES = {
    "FIRST_UPLOAD": {"xp": 50, "badge": "Bias Spotter"},
    "IMPROVEMENT_10": {"xp": 100, "badge": "Fairness Learner"},
    "IMPROVEMENT_25": {"xp": 250, "badge": "Equity Advocate"},
    "AUTOFIX_USED": {"xp": 200, "badge": "System Optimizer"},
    "FAIR_STATE": {"xp": 500, "badge": "AI Guardian"}
}

def get_earned_badges(current_xp: int) -> List[str]:
    badges = []
    if current_xp >= 50: badges.append("First Upload")
    if current_xp >= 150: badges.append("Fairness Improved")
    if current_xp >= 350: badges.append("Auto-Fixer")
    if current_xp >= 800: badges.append("Ethical Hero")
    return badges

def calculate_level(total_xp: int) -> Dict[str, Any]:
    if total_xp >= 1000: return {"level": 5, "name": "AI Sentinel", "next": 2000}
    if total_xp >= 600: return {"level": 4, "name": "AI Guardian", "next": 1000}
    if total_xp >= 300: return {"level": 3, "name": "Ethics Advocate", "next": 600}
    if total_xp >= 100: return {"level": 2, "name": "Fairness Trainee", "next": 300}
    return {"level": 1, "name": "Bias Spotter", "next": 100}
