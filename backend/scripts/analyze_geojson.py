"""
Script per analizzare la struttura del file GeoJSON degli edifici
"""

import json # Non usato direttamente, ma utile per comprensione geojson
import geopandas as gpd
from pathlib import Path
import os

def analyze_geojson_structure(file_path: str):
    """
    Analizza la struttura del file GeoJSON per capire i campi disponibili
    """
    try:
        gdf = gpd.read_file(file_path)
        print("=== ANALISI STRUTTURA GEOJSON ===")
        print(f"File: {file_path}")
        print(f"Numero di edifici: {len(gdf)}")
        print(f"CRS (Sistema di coordinate): {gdf.crs}")
        print()
        print("=== COLONNE DISPONIBILI ===")
        for i, col in enumerate(gdf.columns, 1):
            print(f"{i:2d}. {col}")
        print()
        print("=== TIPI DI DATI ===")
        for col in gdf.columns:
            dtype = gdf[col].dtype
            print(f"{col:20} -> {dtype}")
        print()
        print("=== SAMPLE DATA (primi 3 record) ===")
        for i in range(min(3, len(gdf))):
            print(f"\n--- Edificio {i+1} ---")
            for col_name in gdf.columns:
                if col_name.lower() != 'geometry': # case-insensitive check for geometry
                    value = gdf.iloc[i][col_name]
                    print(f"{col_name:20}: {value}")
                else:
                    geom = gdf.iloc[i]['geometry'] # Assume 'geometry' è il nome esatto della colonna geo
                    print(f"{'geometry':20}: {geom.geom_type} (bounds: {geom.bounds})")
        print("\n=== GEOMETRIE ===")
        geom_types = gdf.geometry.geom_type.value_counts()
        print("Tipi di geometria:")
        for geom_type, count in geom_types.items():
            print(f"  {geom_type}: {count}")
        print(f"\nBounding box generale:")
        bounds = gdf.total_bounds
        print(f"  Min X: {bounds[0]}")
        print(f"  Min Y: {bounds[1]}")
        print(f"  Max X: {bounds[2]}")
        print(f"  Max Y: {bounds[3]}")
        print("\n=== VALORI NULL ===")
        null_counts = gdf.isnull().sum()
        for col, null_count in null_counts.items():
            if null_count > 0:
                print(f"{col:20}: {null_count} valori null")
        return gdf
    except Exception as e:
        print(f"Errore nell'analisi del file GeoJSON: {e}")
        return None

def calculate_centroids(gdf):
    """
    Calcola i centroidi delle geometrie
    """
    if gdf is not None and not gdf.empty and gdf.geometry.is_valid.all():
        print("\n=== CALCOLO CENTROIDI ===")
        try:
            # Assicurati che le geometrie siano valide prima di calcolare i centroidi
            # gdf.geometry = gdf.geometry.buffer(0) # Un trucco per tentare di correggere geometrie invalide
            centroids = gdf.geometry.centroid
            print(f"Centroidi calcolati per {len(centroids)} edifici")
            print("\nPrimi 3 centroidi:")
            for i in range(min(3, len(centroids))):
                centroid = centroids.iloc[i]
                print(f"  Edificio {i+1}: X={centroid.x:.6f}, Y={centroid.y:.6f}")
            return centroids
        except Exception as e:
            print(f"Errore durante il calcolo dei centroidi: {e}")
            return None
    elif gdf is not None and not gdf.geometry.is_valid.all():
        print("\nAVVISO: Alcune geometrie non sono valide. Impossibile calcolare i centroidi in modo affidabile.")
        invalid_geom_count = (~gdf.geometry.is_valid).sum()
        print(f"Numero di geometrie invalide: {invalid_geom_count}")
        return None
    elif gdf is not None and gdf.empty:
        print("\nIl GeoDataFrame è vuoto. Nessun centroide da calcolare.")
        return None
    return None


if __name__ == "__main__":
    # Path del file GeoJSON relativo alla nuova struttura
    # Lo script è in backend/scripts/, dati in backend/data/
    geojson_file_default = os.path.join(os.path.dirname(__file__), "..", "data", "aquila.geojson")

    if not Path(geojson_file_default).exists():
        print(f"File {geojson_file_default} non trovato!")
        print(f"Assicurati che il file sia in: {os.path.abspath(geojson_file_default)}")
        exit(1)

    gdf_analyzed = analyze_geojson_structure(geojson_file_default)
    if gdf_analyzed is not None:
        centroids_calculated = calculate_centroids(gdf_analyzed)