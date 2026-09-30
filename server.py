import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import sqlite3
from urllib.error import HTTPError, URLError
from http.cookies import SimpleCookie
from urllib.parse import parse_qs
from urllib.request import Request, urlopen
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DATABASE = ROOT / "wendersbengaluru.db"
HOST = "0.0.0.0"
PORT = 8787
WHATSAPP_VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "")
WHATSAPP_ACCESS_TOKEN = os.environ.get("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_PHONE_NUMBER_ID = os.environ.get("WHATSAPP_PHONE_NUMBER_ID", "")
CUSTOMER_SESSION_COOKIE = "wenders_customer_session"
CUSTOMER_SESSION_MAX_AGE = 60 * 60 * 24 * 30
PASSWORD_HASH_ITERATIONS = 260_000


def connection():
    database = sqlite3.connect(DATABASE)
    database.row_factory = sqlite3.Row
    database.execute("PRAGMA foreign_keys = ON")
    return database


def initialize_database():
    database = connection()
    try:
        database.executescript((ROOT / "sql" / "schema.sql").read_text(encoding="utf-8"))
        customer_columns = {row[1] for row in database.execute("PRAGMA table_info(customers)").fetchall()}
        if "password_hash" not in customer_columns:
            database.execute("ALTER TABLE customers ADD COLUMN password_hash TEXT")
        existing_columns = {row[1] for row in database.execute("PRAGMA table_info(enquiries)").fetchall()}
        for column, definition in (("arrival_date", "TEXT"), ("departure_date", "TEXT"), ("travellers", "TEXT")):
            if column not in existing_columns:
                database.execute(f"ALTER TABLE enquiries ADD COLUMN {column} {definition}")
        database.executescript((ROOT / "sql" / "seed.sql").read_text(encoding="utf-8"))
        database.commit()
    finally:
        database.close()


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    salt_text = base64.urlsafe_b64encode(salt).decode("ascii")
    digest_text = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt_text}${digest_text}"


def verify_password(password, password_hash):
    try:
        algorithm, iterations, salt_text, expected_text = password_hash.split("$")
        if algorithm != "pbkdf2_sha256" or not 100_000 <= int(iterations) <= 1_000_000:
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(expected_text.encode("ascii"))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def booking_row(row):
    return {
        "id": row["id"],
        "name": row["full_name"],
        "email": row["email"],
        "phone": row["phone"] or "",
        "destination": row["project_type"],
        "arrival": row["arrival_date"] or "",
        "departure": row["departure_date"] or "",
        "travellers": row["travellers"] or "",
        "status": row["status"],
        "createdAt": row["enquiry_date"],
        "updatedAt": row["updated_at"],
    }


def send_whatsapp_reply(recipient, message):
    if not all((WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID)):
        print("WhatsApp auto-reply is not configured")
        return False
    endpoint = f"https://graph.facebook.com/v22.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"
    payload = json.dumps({
        "messaging_product": "whatsapp",
        "to": recipient,
        "type": "text",
        "text": {"body": message},
    }).encode("utf-8")
    request = Request(endpoint, data=payload, headers={
        "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
        "Content-Type": "application/json",
    }, method="POST")
    try:
        with urlopen(request, timeout=15):
            pass
    except (HTTPError, URLError) as error:
        print(f"WhatsApp auto-reply failed: {error}")
        return False
    return True


class ApiHandler(BaseHTTPRequestHandler):
    def is_local_client(self):
        return self.client_address[0] in {"127.0.0.1", "::1"}

    def cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")

    def respond(self, payload, status=200, headers=None):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def customer_session(self, database):
        cookies = SimpleCookie()
        try:
            cookies.load(self.headers.get("Cookie", ""))
        except Exception:
            return None
        session_cookie = cookies.get(CUSTOMER_SESSION_COOKIE)
        if session_cookie is None:
            return None
        token_hash = hashlib.sha256(session_cookie.value.encode("utf-8")).hexdigest()
        return database.execute("""
            SELECT customers.id, customers.full_name, customers.email, customers.phone
            FROM customer_sessions
            JOIN customers ON customers.id = customer_sessions.customer_id
            WHERE customer_sessions.token_hash = ? AND customer_sessions.expires_at > CURRENT_TIMESTAMP
        """, (token_hash,)).fetchone()

    def create_customer_session(self, database, customer_id):
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        database.execute("DELETE FROM customer_sessions WHERE expires_at <= CURRENT_TIMESTAMP")
        database.execute("""
            INSERT INTO customer_sessions (token_hash, customer_id, expires_at)
            VALUES (?, ?, datetime('now', '+30 days'))
        """, (token_hash, customer_id))
        secure = "; Secure" if os.environ.get("CUSTOMER_COOKIE_SECURE") == "1" else ""
        cookie = f"{CUSTOMER_SESSION_COOKIE}={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={CUSTOMER_SESSION_MAX_AGE}{secure}"
        return {"Set-Cookie": cookie}

    @staticmethod
    def clear_customer_session_cookie():
        secure = "; Secure" if os.environ.get("CUSTOMER_COOKIE_SECURE") == "1" else ""
        return {"Set-Cookie": f"{CUSTOMER_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0{secure}"}

    def respond_text(self, body, status=200):
        body = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        return json.loads(self.rfile.read(length) or b"{}")

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/customer/me":
            database = connection()
            try:
                customer = self.customer_session(database)
                if customer is None:
                    self.respond({"error": "Please sign in to view your trips"}, 401)
                    return
                rows = database.execute("""
                    SELECT enquiries.id, enquiries.project_type, enquiries.arrival_date,
                           enquiries.departure_date, enquiries.travellers, enquiries.status,
                              enquiries.enquiry_date, enquiries.updated_at, customers.full_name, customers.email,
                           customers.phone
                    FROM enquiries JOIN customers ON customers.id = enquiries.customer_id
                    WHERE customers.id = ?
                    ORDER BY enquiries.enquiry_date DESC
                """, (customer["id"],)).fetchall()
                self.respond({
                    "account": {"name": customer["full_name"], "email": customer["email"], "phone": customer["phone"] or ""},
                    "bookings": [booking_row(row) for row in rows],
                })
            finally:
                database.close()
            return
        if path == "/webhook":
            query = parse_qs(urlparse(self.path).query)
            if query.get("hub.verify_token", [""])[0] != WHATSAPP_VERIFY_TOKEN:
                self.respond_text("Invalid verify token", 403)
            else:
                self.respond_text(query.get("hub.challenge", [""])[0])
            return
        if path in {"/api/places", "/api/bookings"} and not self.is_local_client():
            self.respond({"error": "Admin API is available only from localhost"}, 403)
            return
        database = connection()
        try:
            if path == "/api/health":
                self.respond({"ok": True, "serverTime": datetime.now(timezone.utc).isoformat()})
            elif path == "/api/places":
                rows = database.execute("SELECT * FROM places ORDER BY created_at DESC").fetchall()
                self.respond([dict(row) for row in rows])
            elif path == "/api/bookings":
                rows = database.execute("""
                    SELECT enquiries.id, enquiries.project_type, enquiries.arrival_date,
                           enquiries.departure_date, enquiries.travellers, enquiries.status,
                              enquiries.enquiry_date, enquiries.updated_at, customers.full_name, customers.email,
                           customers.phone
                    FROM enquiries JOIN customers ON customers.id = enquiries.customer_id
                    ORDER BY enquiries.enquiry_date DESC
                """).fetchall()
                self.respond([booking_row(row) for row in rows])
            else:
                self.respond({"error": "Not found"}, 404)
        finally:
            database.close()

    def do_POST(self):
        path = urlparse(self.path).path
        if path == "/webhook":
            payload = self.read_json()
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    for message in change.get("value", {}).get("messages", []):
                        sender = message.get("from")
                        if sender:
                            send_whatsapp_reply(sender, "Thanks for contacting WendersBengaluru. We received your message and will reply shortly.")
            self.respond({"ok": True})
            return
        if path in {"/api/customer/register", "/api/customer/login", "/api/customer/logout"}:
            if path == "/api/customer/logout":
                database = connection()
                try:
                    customer = self.customer_session(database)
                    if customer is not None:
                        cookies = SimpleCookie(self.headers.get("Cookie", ""))
                        token_hash = hashlib.sha256(cookies[CUSTOMER_SESSION_COOKIE].value.encode("utf-8")).hexdigest()
                        database.execute("DELETE FROM customer_sessions WHERE token_hash = ?", (token_hash,))
                        database.commit()
                finally:
                    database.close()
                self.respond({"ok": True}, headers=self.clear_customer_session_cookie())
                return
            data = self.read_json()
            email = str(data.get("email", "")).strip().lower()
            password = str(data.get("password", ""))
            if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
                self.respond({"error": "Enter a valid email address"}, 400)
                return
            if len(password) < 8:
                self.respond({"error": "Use a password with at least 8 characters"}, 400)
                return
            database = connection()
            try:
                if path == "/api/customer/register":
                    name = str(data.get("name", "")).strip()
                    phone = str(data.get("phone", "")).strip()
                    if not name or not phone:
                        self.respond({"error": "Name and WhatsApp number are required"}, 400)
                        return
                    customer = database.execute(
                        "SELECT id, password_hash FROM customers WHERE email = ?", (email,)
                    ).fetchone()
                    if customer and customer["password_hash"]:
                        self.respond({"error": "An account already uses this email. Sign in instead."}, 409)
                        return
                    if customer:
                        has_bookings = database.execute(
                            "SELECT 1 FROM enquiries WHERE customer_id = ? LIMIT 1", (customer["id"],)
                        ).fetchone()
                        if has_bookings:
                            self.respond({"error": "For privacy, past guest bookings cannot be attached without verifying ownership. Contact us for help."}, 409)
                            return
                        database.execute(
                            "UPDATE customers SET full_name = ?, phone = ?, password_hash = ? WHERE id = ?",
                            (name, phone, hash_password(password), customer["id"]),
                        )
                        customer_id = customer["id"]
                    else:
                        result = database.execute(
                            "INSERT INTO customers (full_name, email, phone, location, password_hash) VALUES (?, ?, ?, ?, ?)",
                            (name, email, phone, "Bengaluru", hash_password(password)),
                        )
                        customer_id = result.lastrowid
                else:
                    customer = database.execute(
                        "SELECT id, full_name, email, phone, password_hash FROM customers WHERE email = ?",
                        (email,),
                    ).fetchone()
                    if customer is None or not customer["password_hash"] or not verify_password(password, customer["password_hash"]):
                        self.respond({"error": "Email or password is incorrect"}, 401)
                        return
                    customer_id = customer["id"]
                customer = database.execute(
                    "SELECT id, full_name, email, phone FROM customers WHERE id = ?", (customer_id,)
                ).fetchone()
                headers = self.create_customer_session(database, customer_id)
                database.commit()
                self.respond({"ok": True, "account": {"name": customer["full_name"], "email": customer["email"], "phone": customer["phone"] or ""}}, headers=headers)
            finally:
                database.close()
            return
        if path != "/api/bookings":
            self.respond({"error": "Not found"}, 404)
            return
        data = self.read_json()
        required = ("name", "email", "phone", "destination", "arrival", "departure", "travellers")
        if any(not data.get(field) for field in required):
            self.respond({"error": "All booking fields are required"}, 400)
            return
        database = connection()
        try:
            customer = self.customer_session(database)
            if customer is None:
                self.respond({"error": "Sign in to your traveller account before booking"}, 401)
                return
            database.execute("""
                INSERT INTO enquiries (customer_id, project_type, message, arrival_date,
                    departure_date, travellers, status, enquiry_date)
                VALUES (?, ?, ?, ?, ?, ?, 'New', CURRENT_TIMESTAMP)
            """, (customer["id"], data["destination"], "Travel booking request", data["arrival"], data["departure"], data["travellers"]))
            database.commit()
            self.respond({"ok": True})
        finally:
            database.close()

    def do_DELETE(self):
        if not self.is_local_client():
            self.respond({"error": "Admin API is available only from localhost"}, 403)
            return
        path_parts = urlparse(self.path).path.strip("/").split("/")
        if len(path_parts) != 3 or path_parts[:2] != ["api", "bookings"]:
            self.respond({"error": "Not found"}, 404)
            return
        database = connection()
        try:
            result = database.execute("DELETE FROM enquiries WHERE id = ?", (path_parts[2],))
            database.commit()
            if result.rowcount == 0:
                self.respond({"error": "Booking not found"}, 404)
                return
            self.respond({"ok": True})
        finally:
            database.close()

    def do_PATCH(self):
        if not self.is_local_client():
            self.respond({"error": "Admin API is available only from localhost"}, 403)
            return
        path_parts = urlparse(self.path).path.strip("/").split("/")
        if len(path_parts) != 3 or path_parts[:2] != ["api", "bookings"]:
            self.respond({"error": "Not found"}, 404)
            return
        data = self.read_json()
        status = data.get("status", "New")
        if status not in {"New", "Planning", "Confirmed", "Completed", "Cancelled"}:
            self.respond({"error": "Invalid booking status"}, 400)
            return
        database = connection()
        try:
            booking = database.execute("""
                SELECT enquiries.status, enquiries.project_type, customers.full_name, customers.phone
                FROM enquiries JOIN customers ON customers.id = enquiries.customer_id
                WHERE enquiries.id = ?
            """, (path_parts[2],)).fetchone()
            if booking is None:
                self.respond({"error": "Booking not found"}, 404)
                return
            database.execute("UPDATE enquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (status, path_parts[2]))
            database.commit()
            notification_sent = False
            if status == "Confirmed" and booking["status"] != "Confirmed" and booking["phone"]:
                notification_sent = send_whatsapp_reply(
                    "".join(character for character in booking["phone"] if character.isdigit()),
                    f"Hello {booking['full_name']}, your {booking['project_type']} booking with WendersBengaluru is confirmed. We will share the final trip details shortly.",
                )
            self.respond({"ok": True, "notificationSent": notification_sent})
        finally:
            database.close()

    def log_message(self, message, *args):
        print(message % args)


if __name__ == "__main__":
    initialize_database()
    print(f"WendersBengaluru API listening on http://localhost:{PORT}")
    ThreadingHTTPServer((HOST, PORT), ApiHandler).serve_forever()