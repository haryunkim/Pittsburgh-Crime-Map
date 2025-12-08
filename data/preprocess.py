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
OUTPUT_MONTHLY_JSON = "data/crime_data.json"

CATEGORY_TO_SEVERITY = {
    # Violent
    "Homicide Offenses": "Violent",
    "Assault Offenses": "Violent",
    "Robbery": "Violent",
    "Kidnapping/Abduction": "Violent",
    "Human Trafficking": "Violent",

    # Serious
    "Weapon Law Violations": "Serious",
    "Drug/Narcotic Offenses": "Serious",
    "Arson": "Serious",
    "Burglary/Breaking & Entering": "Serious",
    "Motor Vehicle Theft": "Serious",

    # Property
    "Larceny/Theft Offenses": "Property",
    "Fraud Offenses": "Property",
    "Destruction/Damage/Vandalism of Property": "Property",

    # Minor
    "All other Offenses": "Minor",
    "Not NIBRS Reportable": "Minor"
}


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
    df = df.rename(columns={
        "YCOORD": "lat",
        "XCOORD": "lng"
    })

    df = df.dropna(subset=["lat", "lng"])
    
    df["ReportedDate"] = pd.to_datetime(df["ReportedDate"], errors="coerce")
    df = df[df["ReportedDate"].notna()]

    df["Year"] = df["ReportedDate"].dt.year
    df["Month"] = df["ReportedDate"].dt.month
    df["MonthName"] = df["ReportedDate"].dt.strftime("%b")

    df["Neighborhood"] = df["Neighborhood"].fillna("Unknown")
    df["Neighborhood"] = df["Neighborhood"].apply(clean_neighborhood)

    df["NIBRS_Offense_Category"] = df["NIBRS_Offense_Category"].fillna("Unknown")
    df["NIBRS_Offense_Type"] = df["NIBRS_Offense_Type"].fillna("Unknown")
    df["Severity"] = df["NIBRS_Offense_Category"].map(CATEGORY_TO_SEVERITY).fillna("Minor")


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


def save_outputs(df):
    """Saves cleaned + aggregated datasets."""

    result = {}

    for (year, month), group in df.groupby(["Year", "Month"]):
        year = str(year)
        month = f"{month:02d}"

        if year not in result:
            result[year] = {}

        crimes = []

        for _, row in group.iterrows():
            crime = {
                "lat": float(row["lat"]),
                "lng": float(row["lng"]),
                "neighborhood": row["Neighborhood"],
                "category": row["NIBRS_Offense_Category"],
                "type": row["NIBRS_Offense_Type"],
                "severity": row["Severity"]
            }
            crimes.append(crime)

        result[year][month] = crimes

    with open(OUTPUT_MONTHLY_JSON, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Saved point-level monthly data → {OUTPUT_MONTHLY_JSON}")


def main():
    if not Path(INPUT_FILE).exists():
        print(f"ERROR: Could not find Excel file: {INPUT_FILE}")
        return
    
    df_raw = load_excel_data(INPUT_FILE)
    df_clean = clean_data(df_raw)
    
    save_outputs(df_clean)

    print("\nData extraction complete.")


if __name__ == "__main__":
    main()

