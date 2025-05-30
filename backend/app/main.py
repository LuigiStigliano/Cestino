from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.apis import geojson, predisposizioni, tfo # Assicurati che questi moduli esistano
# Se hai un router per la root, importalo anche: from app.apis import root_router

app = FastAPI(title=settings.PROJECT_NAME)

# Configurazione CORS
origins = [
    "http://localhost",
    "http://127.0.0.1",
    "null",  # Necessario se apri frontend/index.html direttamente come file
    "http://localhost:8000", # O qualsiasi porta usi per il frontend dev server
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Includi i router delle API
# app.include_router(root_router.router) # Se hai un router per la root
app.include_router(geojson.router, prefix="/geojson", tags=["geojson"])
app.include_router(predisposizioni.router, prefix="/predisposizioni", tags=["predisposizioni"])
app.include_router(tfo.router, prefix="/tfos", tags=["tfos"])

@app.get("/")
def root():
    return {"message": f"Server FastAPI per {settings.PROJECT_NAME} attivo!"}