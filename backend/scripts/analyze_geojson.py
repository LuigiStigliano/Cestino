#!/usr/bin/env python3
"""
Script per analizzare la struttura del file GeoJSON degli edifici
"""

import json
import geopandas as gpd
from pathlib import Path
import os # Aggiunto

def analyze_geojson_structure(file_path: str):
    """
    Analizza la struttura del file GeoJSON per capire i campi disponibili
    """
    # Logica di analisi invariata dal tuo analyze_geojson.py
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
            for col_name in gdf.columns: # Modificato per iterare sulle colonne
                if col_name != 'geometry': # Corretto il nome della colonna
                    value = gdf.iloc[i][col_name]
                    print(f"{col_name:20}: {value}")
                else:
                    geom = gdf.iloc[i]['geometry']
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
    # Logica di calcolo centroidi invariata dal tuo analyze_geojson.py
    if gdf is not None:
        print("\n=== CALCOLO CENTROIDI ===")
        centroids = gdf.geometry.centroid
        print(f"Centroidi calcolati per {len(centroids)} edifici")
        print("\nPrimi 3 centroidi:")
        for i in range(min(3, len(centroids))):
            centroid = centroids.iloc[i]
            print(f"  Edificio {i+1}: X={centroid.x:.6f}, Y={centroid.y:.6f}")
        return centroids
    return None

if __name__ == "__main__":
    # Path del file GeoJSON relativo alla nuova struttura
    geojson_file_default = os.path.join(os.path.dirname(__file__), "..", "data", "aquila.geojson")

    if not Path(geojson_file_default).exists():
        print(f"File {geojson_file_default} non trovato!")
        print("Assicurati che il file sia in mio_progetto_gis/backend/data/aquila.geojson")
        exit(1)

    gdf = analyze_geojson_structure(geojson_file_default)
    if gdf is not None:
        centroids = calculate_centroids(gdf)