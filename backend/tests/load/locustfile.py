"""Load test scaffold for the Chaplin backend, using Locust (free, local, no
external account needed).

Simulates a realistic mix of traffic: a new user registers and logs in once,
then repeatedly browses posts/tracks/health like a real client would. Points
at whatever CHAPLIN_ENV/DB the target server is running - never run this
against a real production deployment without warning whoever owns it first.

Usage (from backend/, with the dev venv active):
    ../.venv-1/Scripts/python.exe -m locust -f tests/load/locustfile.py --host http://127.0.0.1:8010

Then open http://localhost:8089 to set concurrent user count / spawn rate
and start the run from the web UI. Headless example (50 users, 15/min):
    ...locust ... --headless -u 50 -r 15 -t 3m
"""
import random
import uuid

from locust import HttpUser, task, between


class ChaplinUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        suffix = uuid.uuid4().hex[:10]
        self.email = f"loadtest_{suffix}@example.com"
        self.username = f"loadtest_{suffix}"
        self.password = "LoadTest123!"

        with self.client.post(
            "/api/v1/auth/register",
            json={
                "email": self.email,
                "username": self.username,
                "password": self.password,
                "invitation_code": "CHA2024",
                "role": "casual",
                "first_name": "Load",
                "last_name": "Test",
                "birth_date": "2000-01-01",
                "social_goal": "prueba de carga",
            },
            catch_response=True,
        ) as resp:
            # A 429 here just means this Locust worker is registering faster
            # than the rate limit added for real users allows - expected and
            # fine under heavy concurrency, not a failure of the app itself.
            if resp.status_code not in (200, 429):
                resp.failure(f"registro inesperado: {resp.status_code}")

        self.token = None
        with self.client.post(
            "/api/v1/auth/login",
            data={"username": self.username, "password": self.password},
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
            elif resp.status_code in (401, 429):
                # Expected when this worker's own /auth/register call above
                # got 429'd by the rate limiter and never created the user -
                # not a real login failure.
                resp.success()
            else:
                resp.failure(f"login inesperado: {resp.status_code}")

    def _auth_headers(self):
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}

    @task(5)
    def health(self):
        self.client.get("/api/v1/health")

    @task(3)
    def browse_posts(self):
        self.client.get("/api/v1/posts/", headers=self._auth_headers())

    @task(3)
    def browse_tracks(self):
        self.client.get("/api/v1/tracks/", headers=self._auth_headers())

    @task(2)
    def browse_forum(self):
        self.client.get("/api/v1/forum/threads", headers=self._auth_headers())

    @task(1)
    def read_tags(self):
        self.client.get("/api/v1/tags")
