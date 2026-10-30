from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import math
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import uuid
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALG = "HS256"
JWT_TTL_HOURS = 24 * 30  # 30 days

app = FastAPI(title="NL BUS API")


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")


# ------------------------- Models -------------------------

class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    name: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str] = None


class Stop(BaseModel):
    id: str
    name: str
    lat: float
    lng: float
    address: Optional[str] = None


class LineStop(BaseModel):
    stop_id: str
    order: int
    arrival_offset_min: int  # minutes from line start


class BusLine(BaseModel):
    id: str
    code: str  # e.g., "101"
    name: str  # e.g., "Centro - Jardim Canadá"
    origin: str
    destination: str
    color: str
    schedule: List[str]  # HH:MM departures from origin
    stops: List[LineStop]
    operating_days: str  # "all" | "weekdays" | "weekends"
    duration_min: int
    fare: float


class FavoriteCreate(BaseModel):
    item_type: str  # "line" or "stop"
    item_id: str


class Favorite(BaseModel):
    id: str
    user_id: str
    item_type: str
    item_id: str
    created_at: datetime


class RatingCreate(BaseModel):
    line_id: str
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class Rating(BaseModel):
    id: str
    user_id: Optional[str]
    line_id: str
    stars: int
    comment: Optional[str]
    created_at: datetime


class PlanRequest(BaseModel):
    origin_lat: float
    origin_lng: float
    dest_lat: float
    dest_lng: float


class PlanOption(BaseModel):
    line_id: str
    line_code: str
    line_name: str
    board_stop: dict
    exit_stop: dict
    walk_to_board_min: int
    bus_time_min: int
    walk_to_dest_min: int
    total_min: int
    fare: float


# ------------------------- Auth helpers -------------------------

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_pw(pw: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), h.encode("utf-8"))
    except Exception:
        return False


def make_token(user_id: str, email: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + timedelta(hours=JWT_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except Exception:
        return None
    user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
    return user


async def require_user(user=Depends(get_current_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Autenticação necessária")
    return user


# ------------------------- Seed data (Nova Lima) -------------------------

NOVA_LIMA_STOPS = [
    {"id": "stop-centro-01", "name": "Praça Bernardino Monteiro", "lat": -19.9856, "lng": -43.8471, "address": "Centro, Nova Lima"},
    {"id": "stop-centro-02", "name": "Terminal Rodoviário NL", "lat": -19.9872, "lng": -43.8486, "address": "Centro, Nova Lima"},
    {"id": "stop-centro-03", "name": "Rua da Matriz", "lat": -19.9839, "lng": -43.8465, "address": "Centro, Nova Lima"},
    {"id": "stop-honorio-01", "name": "Honório Bicalho", "lat": -19.9985, "lng": -43.8102, "address": "Honório Bicalho, Nova Lima"},
    {"id": "stop-honorio-02", "name": "Praça Honório Bicalho", "lat": -19.9998, "lng": -43.8089, "address": "Honório Bicalho, Nova Lima"},
    {"id": "stop-jardim-01", "name": "Jardim Canadá - Entrada", "lat": -20.0532, "lng": -43.9712, "address": "Jardim Canadá, Nova Lima"},
    {"id": "stop-jardim-02", "name": "Alameda das Palmeiras", "lat": -20.0556, "lng": -43.9734, "address": "Jardim Canadá, Nova Lima"},
    {"id": "stop-vale-01", "name": "Vale do Sereno", "lat": -19.9719, "lng": -43.9321, "address": "Vale do Sereno, Nova Lima"},
    {"id": "stop-vale-02", "name": "Alphaville", "lat": -19.9684, "lng": -43.9389, "address": "Alphaville, Nova Lima"},
    {"id": "stop-vespasiano-01", "name": "Vespasiano - Vila Industrial", "lat": -19.9612, "lng": -43.8512, "address": "Vespasiano, Nova Lima"},
    {"id": "stop-bh-savassi", "name": "BH - Savassi", "lat": -19.9387, "lng": -43.9343, "address": "Savassi, Belo Horizonte"},
    {"id": "stop-bh-centro", "name": "BH - Praça Sete", "lat": -19.9208, "lng": -43.9376, "address": "Centro, Belo Horizonte"},
    {"id": "stop-raposos-01", "name": "Raposos - Centro", "lat": -19.9696, "lng": -43.8023, "address": "Centro, Raposos"},
    {"id": "stop-rioacima-01", "name": "Rio Acima - Praça Principal", "lat": -20.0896, "lng": -43.7845, "address": "Centro, Rio Acima"},
    {"id": "stop-sabara-01", "name": "Sabará - Centro Histórico", "lat": -19.8878, "lng": -43.8023, "address": "Centro, Sabará"},
    {"id": "stop-cristais-01", "name": "Cristais", "lat": -19.9956, "lng": -43.8667, "address": "Cristais, Nova Lima"},
    {"id": "stop-aguaslimpas-01", "name": "Águas Limpas", "lat": -19.9789, "lng": -43.8356, "address": "Águas Limpas, Nova Lima"},
    {"id": "stop-retiro-01", "name": "Retiro Mangabeiras", "lat": -19.9634, "lng": -43.9123, "address": "Retiro, Nova Lima"},
]


NOVA_LIMA_LINES = [
    {
        "id": "line-101",
        "code": "101",
        "name": "Centro - Jardim Canadá",
        "origin": "Terminal Rodoviário NL",
        "destination": "Jardim Canadá",
        "color": "#0284C7",
        "schedule": ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "09:00", "10:00", "11:30", "13:00", "14:30", "16:00", "17:00", "17:30", "18:00", "18:30", "19:30", "21:00"],
        "operating_days": "all",
        "duration_min": 45,
        "fare": 5.25,
        "stops": [
            {"stop_id": "stop-centro-02", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-centro-01", "order": 2, "arrival_offset_min": 3},
            {"stop_id": "stop-cristais-01", "order": 3, "arrival_offset_min": 10},
            {"stop_id": "stop-retiro-01", "order": 4, "arrival_offset_min": 22},
            {"stop_id": "stop-jardim-01", "order": 5, "arrival_offset_min": 38},
            {"stop_id": "stop-jardim-02", "order": 6, "arrival_offset_min": 45},
        ],
    },
    {
        "id": "line-202",
        "code": "202",
        "name": "Centro - Honório Bicalho",
        "origin": "Praça Bernardino Monteiro",
        "destination": "Honório Bicalho",
        "color": "#10B981",
        "schedule": ["05:45", "06:15", "06:45", "07:15", "08:00", "09:30", "11:00", "12:30", "14:00", "15:30", "17:00", "17:45", "18:30", "19:30", "20:30"],
        "operating_days": "all",
        "duration_min": 35,
        "fare": 4.75,
        "stops": [
            {"stop_id": "stop-centro-01", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-centro-03", "order": 2, "arrival_offset_min": 2},
            {"stop_id": "stop-aguaslimpas-01", "order": 3, "arrival_offset_min": 12},
            {"stop_id": "stop-honorio-01", "order": 4, "arrival_offset_min": 28},
            {"stop_id": "stop-honorio-02", "order": 5, "arrival_offset_min": 35},
        ],
    },
    {
        "id": "line-303",
        "code": "303",
        "name": "NL - BH Savassi (Expresso)",
        "origin": "Terminal Rodoviário NL",
        "destination": "BH Savassi",
        "color": "#F59E0B",
        "schedule": ["05:30", "06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "10:00", "12:00", "14:00", "16:00", "17:00", "17:30", "18:00", "18:30", "19:00", "20:00", "22:00"],
        "operating_days": "all",
        "duration_min": 55,
        "fare": 7.50,
        "stops": [
            {"stop_id": "stop-centro-02", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-vale-01", "order": 2, "arrival_offset_min": 18},
            {"stop_id": "stop-vale-02", "order": 3, "arrival_offset_min": 25},
            {"stop_id": "stop-bh-savassi", "order": 4, "arrival_offset_min": 45},
            {"stop_id": "stop-bh-centro", "order": 5, "arrival_offset_min": 55},
        ],
    },
    {
        "id": "line-404",
        "code": "404",
        "name": "Centro - Alphaville",
        "origin": "Praça Bernardino Monteiro",
        "destination": "Alphaville",
        "color": "#8B5CF6",
        "schedule": ["06:00", "07:00", "08:00", "09:30", "11:00", "13:00", "15:00", "17:00", "18:00", "19:00", "20:30"],
        "operating_days": "weekdays",
        "duration_min": 40,
        "fare": 6.00,
        "stops": [
            {"stop_id": "stop-centro-01", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-retiro-01", "order": 2, "arrival_offset_min": 15},
            {"stop_id": "stop-vale-01", "order": 3, "arrival_offset_min": 28},
            {"stop_id": "stop-vale-02", "order": 4, "arrival_offset_min": 40},
        ],
    },
    {
        "id": "line-505",
        "code": "505",
        "name": "NL - Raposos",
        "origin": "Terminal Rodoviário NL",
        "destination": "Raposos Centro",
        "color": "#EF4444",
        "schedule": ["06:30", "08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"],
        "operating_days": "all",
        "duration_min": 30,
        "fare": 5.00,
        "stops": [
            {"stop_id": "stop-centro-02", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-aguaslimpas-01", "order": 2, "arrival_offset_min": 10},
            {"stop_id": "stop-raposos-01", "order": 3, "arrival_offset_min": 30},
        ],
    },
    {
        "id": "line-606",
        "code": "606",
        "name": "NL - Rio Acima",
        "origin": "Terminal Rodoviário NL",
        "destination": "Rio Acima",
        "color": "#14B8A6",
        "schedule": ["06:00", "08:30", "11:00", "13:30", "16:00", "18:30", "20:30"],
        "operating_days": "all",
        "duration_min": 50,
        "fare": 6.75,
        "stops": [
            {"stop_id": "stop-centro-02", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-cristais-01", "order": 2, "arrival_offset_min": 10},
            {"stop_id": "stop-retiro-01", "order": 3, "arrival_offset_min": 25},
            {"stop_id": "stop-rioacima-01", "order": 4, "arrival_offset_min": 50},
        ],
    },
    {
        "id": "line-707",
        "code": "707",
        "name": "NL - Sabará",
        "origin": "Terminal Rodoviário NL",
        "destination": "Sabará Centro Histórico",
        "color": "#DB2777",
        "schedule": ["06:15", "08:15", "10:15", "12:15", "14:15", "16:15", "18:15", "20:15"],
        "operating_days": "all",
        "duration_min": 45,
        "fare": 6.50,
        "stops": [
            {"stop_id": "stop-centro-02", "order": 1, "arrival_offset_min": 0},
            {"stop_id": "stop-aguaslimpas-01", "order": 2, "arrival_offset_min": 10},
            {"stop_id": "stop-honorio-01", "order": 3, "arrival_offset_min": 22},
            {"stop_id": "stop-sabara-01", "order": 4, "arrival_offset_min": 45},
        ],
    },
]


async def seed_data():
    stops_count = await db.stops.count_documents({})
    if stops_count == 0:
        await db.stops.insert_many([dict(s) for s in NOVA_LIMA_STOPS])
    lines_count = await db.lines.count_documents({})
    if lines_count == 0:
        await db.lines.insert_many([dict(l) for l in NOVA_LIMA_LINES])


# ------------------------- Utility -------------------------

def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def minutes_from_schedule(dep_hhmm: str, offset_min: int) -> str:
    h, m = map(int, dep_hhmm.split(":"))
    total = h * 60 + m + offset_min
    total %= 24 * 60
    return f"{total // 60:02d}:{total % 60:02d}"


def next_arrival(line: dict, stop_offset: int) -> Optional[dict]:
    now = datetime.now()
    now_min = now.hour * 60 + now.minute
    best = None
    for dep in line["schedule"]:
        h, m = map(int, dep.split(":"))
        start = h * 60 + m
        arrival_total = (start + stop_offset) % (24 * 60)
        delta = arrival_total - now_min
        if delta < 0:
            delta += 24 * 60
        if best is None or delta < best["in_min"]:
            best = {"departure": dep, "arrival": f"{arrival_total // 60:02d}:{arrival_total % 60:02d}", "in_min": delta}
    return best


# ------------------------- Routes -------------------------

@api_router.get("/")
async def root():
    return {"message": "NL BUS API", "status": "ok"}


@api_router.post("/auth/register", response_model=AuthResponse)
async def register(body: Credentials):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    uid = str(uuid.uuid4())
    doc = {
        "id": uid,
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": hash_pw(body.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = make_token(uid, email)
    return AuthResponse(access_token=token, user={"id": uid, "email": email, "name": doc["name"]})


@api_router.post("/auth/login", response_model=AuthResponse)
async def login(body: Credentials):
    email = body.email.lower()
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_pw(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = make_token(user["id"], email)
    return AuthResponse(access_token=token, user={"id": user["id"], "email": email, "name": user.get("name")})


@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(require_user)):
    return UserOut(id=user["id"], email=user["email"], name=user.get("name"))


@api_router.get("/lines", response_model=List[BusLine])
async def list_lines(q: Optional[str] = None):
    query = {}
    if q:
        query = {"$or": [
            {"code": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
            {"origin": {"$regex": q, "$options": "i"}},
            {"destination": {"$regex": q, "$options": "i"}},
        ]}
    docs = await db.lines.find(query, {"_id": 0}).to_list(500)
    return [BusLine(**d) for d in docs]


@api_router.get("/lines/{line_id}")
async def line_detail(line_id: str):
    line = await db.lines.find_one({"id": line_id}, {"_id": 0})
    if not line:
        raise HTTPException(status_code=404, detail="Linha não encontrada")
    stops_by_id = {s["id"]: s async for s in db.stops.find({}, {"_id": 0})}
    enriched_stops = []
    for ls in line["stops"]:
        s = stops_by_id.get(ls["stop_id"])
        if not s:
            continue
        enriched_stops.append({
            **s,
            "order": ls["order"],
            "arrival_offset_min": ls["arrival_offset_min"],
            "next_arrival": next_arrival(line, ls["arrival_offset_min"]),
        })
    ratings = await db.ratings.find({"line_id": line_id}, {"_id": 0}).to_list(500)
    avg = round(sum(r["stars"] for r in ratings) / len(ratings), 1) if ratings else None
    return {**line, "stops": enriched_stops, "rating_avg": avg, "rating_count": len(ratings)}


@api_router.get("/stops", response_model=List[Stop])
async def list_stops():
    docs = await db.stops.find({}, {"_id": 0}).to_list(500)
    return [Stop(**d) for d in docs]


@api_router.get("/stops/nearby")
async def nearby_stops(lat: float, lng: float, radius_km: float = 2.0):
    all_stops = await db.stops.find({}, {"_id": 0}).to_list(500)
    with_dist = []
    for s in all_stops:
        d = haversine_km(lat, lng, s["lat"], s["lng"])
        if d <= radius_km:
            with_dist.append({**s, "distance_km": round(d, 2)})
    with_dist.sort(key=lambda x: x["distance_km"])
    # enrich with lines that pass each stop
    lines = await db.lines.find({}, {"_id": 0}).to_list(500)
    stop_lines = {}
    for ln in lines:
        for ls in ln["stops"]:
            stop_lines.setdefault(ls["stop_id"], []).append({
                "line_id": ln["id"], "code": ln["code"], "name": ln["name"], "color": ln["color"],
                "next_arrival": next_arrival(ln, ls["arrival_offset_min"]),
            })
    for s in with_dist:
        s["lines"] = stop_lines.get(s["id"], [])
    return with_dist[:20]


@api_router.get("/stops/{stop_id}")
async def stop_detail(stop_id: str):
    s = await db.stops.find_one({"id": stop_id}, {"_id": 0})
    if not s:
        raise HTTPException(status_code=404, detail="Ponto não encontrado")
    lines = await db.lines.find({}, {"_id": 0}).to_list(500)
    passing = []
    for ln in lines:
        for ls in ln["stops"]:
            if ls["stop_id"] == stop_id:
                passing.append({
                    "line_id": ln["id"], "code": ln["code"], "name": ln["name"], "color": ln["color"],
                    "destination": ln["destination"],
                    "next_arrival": next_arrival(ln, ls["arrival_offset_min"]),
                })
    return {**s, "lines": passing}


@api_router.get("/favorites")
async def list_favorites(user=Depends(require_user)):
    docs = await db.favorites.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    return docs


@api_router.post("/favorites")
async def add_favorite(body: FavoriteCreate, user=Depends(require_user)):
    existing = await db.favorites.find_one({"user_id": user["id"], "item_type": body.item_type, "item_id": body.item_id})
    if existing:
        return {"ok": True, "already": True}
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "item_type": body.item_type,
        "item_id": body.item_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.favorites.insert_one(doc)
    return {"ok": True, "already": False}


@api_router.delete("/favorites")
async def remove_favorite(item_type: str, item_id: str, user=Depends(require_user)):
    r = await db.favorites.delete_many({"user_id": user["id"], "item_type": item_type, "item_id": item_id})
    return {"ok": True, "deleted": r.deleted_count}


@api_router.post("/ratings")
async def rate_line(body: RatingCreate, user=Depends(get_current_user)):
    line = await db.lines.find_one({"id": body.line_id})
    if not line:
        raise HTTPException(status_code=404, detail="Linha não encontrada")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"] if user else None,
        "line_id": body.line_id,
        "stars": body.stars,
        "comment": body.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ratings.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api_router.get("/ratings/{line_id}")
async def line_ratings(line_id: str):
    docs = await db.ratings.find({"line_id": line_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    avg = round(sum(r["stars"] for r in docs) / len(docs), 1) if docs else None
    return {"items": docs, "avg": avg, "count": len(docs)}


@api_router.post("/planner")
async def planner(body: PlanRequest):
    stops = await db.stops.find({}, {"_id": 0}).to_list(500)
    lines = await db.lines.find({}, {"_id": 0}).to_list(500)
    stops_by_id = {s["id"]: s for s in stops}

    def walk_min(d_km: float) -> int:
        return max(1, int(round(d_km * 12)))  # ~5km/h

    options: List[dict] = []
    for ln in lines:
        best = None
        for i, board in enumerate(ln["stops"]):
            bs = stops_by_id.get(board["stop_id"])
            if not bs:
                continue
            d_board = haversine_km(body.origin_lat, body.origin_lng, bs["lat"], bs["lng"])
            if d_board > 3.0:
                continue
            for j in range(i + 1, len(ln["stops"])):
                exit_ls = ln["stops"][j]
                es = stops_by_id.get(exit_ls["stop_id"])
                if not es:
                    continue
                d_exit = haversine_km(body.dest_lat, body.dest_lng, es["lat"], es["lng"])
                if d_exit > 3.0:
                    continue
                bus_time = exit_ls["arrival_offset_min"] - board["arrival_offset_min"]
                total = walk_min(d_board) + bus_time + walk_min(d_exit)
                opt = {
                    "line_id": ln["id"],
                    "line_code": ln["code"],
                    "line_name": ln["name"],
                    "line_color": ln["color"],
                    "board_stop": {**bs, "order": board["order"]},
                    "exit_stop": {**es, "order": exit_ls["order"]},
                    "walk_to_board_min": walk_min(d_board),
                    "bus_time_min": bus_time,
                    "walk_to_dest_min": walk_min(d_exit),
                    "total_min": total,
                    "fare": ln["fare"],
                    "next_departure": next_arrival(ln, board["arrival_offset_min"]),
                }
                if best is None or total < best["total_min"]:
                    best = opt
        if best:
            options.append(best)
    options.sort(key=lambda x: x["total_min"])
    return {"options": options[:5]}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await seed_data()
    logger.info("NL BUS seeded. Stops: %d, Lines: %d",
                await db.stops.count_documents({}),
                await db.lines.count_documents({}))


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
