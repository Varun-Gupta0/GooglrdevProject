import pandas as pd
import io
from typing import List, Dict, Any

def parse_csv(content: bytes) -> pd.DataFrame:
    """Parses CSV bytes into a DataFrame."""
    return pd.read_csv(io.BytesIO(content))

def get_column_info(df: pd.DataFrame) -> List[Dict[str, str]]:
    """Returns column names and their detected types."""
    info = []
    for col in df.columns:
        dtype = str(df[col].dtype)
        col_type = "numeric" if "int" in dtype or "float" in dtype else "categorical"
        info.append({"name": col, "type": col_type})
    return info
