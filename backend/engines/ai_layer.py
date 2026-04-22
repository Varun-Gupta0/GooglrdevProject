import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from sklearn.preprocessing import LabelEncoder
from typing import Dict, List, Any

class EquiLensModel:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.label_encoders = {}
        self.feature_names = []
        self.is_trained = False
        self.accuracy = 0

    def preprocess(self, df: pd.DataFrame, target: str):
        processed_df = df.copy()
        
        # Encode categorical columns
        for col in processed_df.columns:
            if processed_df[col].dtype == 'object':
                le = LabelEncoder()
                processed_df[col] = le.fit_transform(processed_df[col].astype(str))
                self.label_encoders[col] = le
        
        X = processed_df.drop(columns=[target])
        y = processed_df[target]
        self.feature_names = list(X.columns)
        return X, y

    def train(self, df: pd.DataFrame, target: str):
        X, y = self.preprocess(df, target)
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model.fit(X_train, y_train)
        preds = self.model.predict(X_test)
        self.accuracy = accuracy_score(y_test, preds)
        self.is_trained = True
        return self.accuracy

    def get_feature_importance(self) -> List[Dict[str, Any]]:
        if not self.is_trained:
            return []
        
        importances = self.model.feature_importances_
        return [
            {"feature": name, "importance": float(imp)} 
            for name, imp in zip(self.feature_names, importances)
        ]

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        # Preprocess input (excluding target)
        processed_df = df.copy()
        for col, le in self.label_encoders.items():
            if col in processed_df.columns:
                processed_df[col] = le.transform(processed_df[col].astype(str))
        
        # Ensure we only use the features the model was trained on
        X = processed_df[self.feature_names]
        return self.model.predict(X)

def get_ai_scorecard(df: pd.DataFrame, target: str, protected_attrs: List[str]) -> Dict[str, Any]:
    """Trains a model and returns bias metrics based on MODEL PREDICTIONS."""
    model_wrapper = EquiLensModel()
    accuracy = model_wrapper.train(df, target)
    
    # Add model predictions to the dataframe to analyze BIAS IN THE MODEL
    df_with_preds = df.copy()
    df_with_preds['predictions'] = model_wrapper.predict(df)
    
    from .bias_engine import get_overall_scorecard
    # Calculate bias based on model predictions
    scorecard = get_overall_scorecard(df_with_preds, 'predictions', protected_attrs)
    
    scorecard['accuracy_proxy'] = round(accuracy * 100, 2)
    scorecard['model_importance'] = model_wrapper.get_feature_importance()
    
    return scorecard, model_wrapper
