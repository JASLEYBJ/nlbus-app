"""NL BUS backend API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://nlbus-app--9lq5aypa.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def existing_token(s):
    # Pre-existing user from problem statement
    r = s.post(f"{API}/auth/login", json={"email": "test@nlbus.app", "password": "senha1234"})
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def new_user(s):
    email = f"TEST_{uuid.uuid4().hex[:8]}@nlbus.app"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "senha1234", "name": "Teste"})
    assert r.status_code == 200, r.text
    data = r.json()
    return {"email": email, "token": data["access_token"], "user": data["user"]}


# ---------- Lines ----------
class TestLines:
    def test_list_lines_returns_seven(self, s):
        r = s.get(f"{API}/lines")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) == 7, f"expected 7 lines, got {len(data)}"
        codes = {d["code"] for d in data}
        assert {"101", "202", "303", "404", "505", "606", "707"} <= codes

    def test_line_detail_enriched(self, s):
        r = s.get(f"{API}/lines/line-101")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "line-101"
        assert len(d["stops"]) >= 1
        first = d["stops"][0]
        for k in ("lat", "lng", "name", "next_arrival", "order", "arrival_offset_min"):
            assert k in first, f"missing {k}"
        assert "in_min" in first["next_arrival"]

    def test_line_not_found(self, s):
        r = s.get(f"{API}/lines/line-does-not-exist")
        assert r.status_code == 404


# ---------- Stops ----------
class TestStops:
    def test_nearby_ordered(self, s):
        # Centro Nova Lima
        r = s.get(f"{API}/stops/nearby", params={"lat": -19.9856, "lng": -43.8471, "radius_km": 5})
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list) and len(data) > 0
        dists = [x["distance_km"] for x in data]
        assert dists == sorted(dists), "not sorted by distance"
        assert "lines" in data[0]
        assert isinstance(data[0]["lines"], list)

    def test_stop_detail_passing_lines(self, s):
        r = s.get(f"{API}/stops/stop-centro-02")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "stop-centro-02"
        assert len(d["lines"]) >= 1
        assert "next_arrival" in d["lines"][0]

    def test_stop_not_found(self, s):
        r = s.get(f"{API}/stops/does-not-exist")
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_register_duplicate(self, s, new_user):
        r = s.post(f"{API}/auth/register", json={"email": new_user["email"], "password": "senha1234"})
        assert r.status_code == 409

    def test_login_valid(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "test@nlbus.app", "password": "senha1234"})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_wrong_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "test@nlbus.app", "password": "wrongpass"})
        assert r.status_code == 401

    def test_me_bearer(self, s, existing_token):
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {existing_token}"})
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == "test@nlbus.app"
        assert "id" in d

    def test_me_unauthorized(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Favorites ----------
class TestFavorites:
    def test_fav_crud(self, s, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        # add
        r = s.post(f"{API}/favorites", json={"item_type": "line", "item_id": "line-101"}, headers=h)
        assert r.status_code == 200 and r.json()["ok"] is True
        # list contains
        r = s.get(f"{API}/favorites", headers=h)
        assert r.status_code == 200
        items = r.json()
        assert any(x["item_id"] == "line-101" and x["item_type"] == "line" for x in items)
        # idempotent add
        r = s.post(f"{API}/favorites", json={"item_type": "line", "item_id": "line-101"}, headers=h)
        assert r.status_code == 200 and r.json().get("already") is True
        # delete
        r = s.delete(f"{API}/favorites", params={"item_type": "line", "item_id": "line-101"}, headers=h)
        assert r.status_code == 200 and r.json()["deleted"] >= 1
        # verify removed
        r = s.get(f"{API}/favorites", headers=h)
        assert not any(x["item_id"] == "line-101" for x in r.json())

    def test_fav_requires_auth(self, s):
        r = s.get(f"{API}/favorites")
        assert r.status_code == 401


# ---------- Ratings ----------
class TestRatings:
    def test_rate_and_fetch(self, s, new_user):
        h = {"Authorization": f"Bearer {new_user['token']}"}
        r = s.post(f"{API}/ratings", json={"line_id": "line-202", "stars": 5, "comment": "TEST ótimo"}, headers=h)
        assert r.status_code == 200
        rid = r.json()["id"]
        assert rid
        r = s.get(f"{API}/ratings/line-202")
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 1
        assert d["avg"] is not None and 1 <= d["avg"] <= 5

    def test_rate_invalid_line(self, s):
        r = s.post(f"{API}/ratings", json={"line_id": "nope", "stars": 3})
        assert r.status_code == 404


# ---------- Planner ----------
class TestPlanner:
    def test_planner_sorted(self, s):
        # Terminal NL -> Jardim Canadá
        r = s.post(f"{API}/planner", json={
            "origin_lat": -19.9872, "origin_lng": -43.8486,
            "dest_lat": -20.0532, "dest_lng": -43.9712,
        })
        assert r.status_code == 200
        opts = r.json()["options"]
        assert isinstance(opts, list) and len(opts) >= 1
        totals = [o["total_min"] for o in opts]
        assert totals == sorted(totals), "options not sorted by total_min"
        o0 = opts[0]
        for k in ("line_id", "line_code", "board_stop", "exit_stop", "walk_to_board_min", "bus_time_min", "walk_to_dest_min", "total_min", "fare"):
            assert k in o0
