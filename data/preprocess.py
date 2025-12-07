"""
extract_month.py
----------------
Loads the raw Excel dataset (Jan 2024 – Oct 2025),
cleans date fields,
aggregates monthly crime counts by neighborhood,
and saves outputs for downstream visualization (D3, web apps).
"""

import pandas as pd
import json
from pathlib import Path
import re
import unicodedata


INPUT_FILE = "data/raw/crime_jan1_oct31_2025.xlsx"
OUTPUT_MONTHLY_JSON = "data/processed/crime_monthly.json"

NEIGHBORHOOD_NORMALIZATION_MAP = {
    "spring hill city view": "Spring Hill-City View",
    "spring hill-city view": "Spring Hill-City View",
    "spring hill–city view": "Spring Hill-City View",
    "spring hill—city view": "Spring Hill-City View",

    "lincoln lemington belmar": "Lincoln-Lemington-Belmar",
    "lincoln-lemington-belmar": "Lincoln-Lemington-Belmar",
    "lincoln–lemington–belmar": "Lincoln-Lemington-Belmar",
    "lincoln—lemington—belmar": "Lincoln-Lemington-Belmar",
}


def load_excel_data(filepath):
    """Loads the crime data directly from Excel to avoid encoding issues."""
    print(f"Loading Excel file: {filepath}")
    df = pd.read_excel(filepath)
    print(f"Loaded {len(df)} rows.")
    return df


def clean_data(df):
    """Standardizes date formats and extracts Year/Month fields."""
    
    df["ReportedDate"] = pd.to_datetime(df["ReportedDate"], errors="coerce")

    df = df[df["ReportedDate"].notna()]

    df["Year"] = df["ReportedDate"].dt.year
    df["Month"] = df["ReportedDate"].dt.month
    df["MonthName"] = df["ReportedDate"].dt.strftime("%b")  # Jan, Feb, etc.

    
    df["Neighborhood"] = df["Neighborhood"].fillna("Unknown")
    df["Neighborhood"] = df["Neighborhood"].apply(clean_neighborhood)

   
    df["XCOORD"] = pd.to_numeric(df.get("XCOORD"), errors="coerce")
    df["YCOORD"] = pd.to_numeric(df.get("YCOORD"), errors="coerce")

    print("Finished cleaning data.")
    return df

def clean_neighborhood(name):
    if not isinstance(name, str):
        return name

   
    n = unicodedata.normalize("NFKC", name).strip()

    
    n = re.sub(r"[\u2012\u2013\u2014\u2015]", "-", n)

    
    n = re.sub(r"\s*-\s*", "-", n)

    key = n.lower()

  
    if key in NEIGHBORHOOD_NORMALIZATION_MAP:
        return NEIGHBORHOOD_NORMALIZATION_MAP[key]

   
    return " ".join(word.capitalize() for word in n.split())

def build_monthly_counts(df):
    """Aggregates total crime counts per year/month/neighborhood."""
    monthly = (
        df.groupby(["Year", "Month", "MonthName", "Neighborhood"])
          .size()
          .reset_index(name="Count")
          .sort_values(["Year", "Month", "Neighborhood"])
    )

    print(f"Built monthly counts with {len(monthly)} grouped rows.")
    return monthly


def save_outputs(df_clean, df_monthly):
    """Saves cleaned + aggregated datasets."""

  
    json_dict = {}
    for _, row in df_monthly.iterrows():
        year = str(row["Year"])
        month = str(row["Month"]).zfill(2)
        hood = row["Neighborhood"]
        count = int(row["Count"])

        json_dict.setdefault(year, {}).setdefault(month, {})[hood] = count

    with open(OUTPUT_MONTHLY_JSON, "w") as f:
        json.dump(json_dict, f, indent=2)

    print("Saved output:")
    print(f"  - {OUTPUT_MONTHLY_JSON}")


def main():
    if not Path(INPUT_FILE).exists():
        print(f"ERROR: Could not find Excel file: {INPUT_FILE}")
        return
    
    df_raw = load_excel_data(INPUT_FILE)
    df_clean = clean_data(df_raw)

    df_monthly = build_monthly_counts(df_clean)
    
    save_outputs(df_clean, df_monthly)

    print("\nData extraction complete.")


if __name__ == "__main__":
    main()

