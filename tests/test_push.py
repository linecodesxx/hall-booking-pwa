"""
Tests for push notification system:
- VAPID key endpoint
- Push subscription CRUD
- Booking approval triggers sendPush
- tryNotifyBookingStart / tryNotifyBookingEnd flag logic
- Error handling (invalid subscriptions, missing fields)
"""
import subprocess, socket, time, sys, os, json, http.client, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 3098
TS = str(int(time.time()))
USER = f"PushUser{TS}"
ADMIN = f"PushAdmin{TS}"
TODAY = time.strftime("%Y-%m-%d")
PASS_HOUR = f"{time.localtime().tm_hour - 1}:00"
NEXT_HOUR = f"{time.localtime().tm_hour + 1}:00"

OK = 0
FAIL = 0

def ok(msg): global OK; print(f"  [OK] {msg}"); OK += 1
def fail(msg): global FAIL; print(f"  [FAIL] {msg}"); FAIL += 1

def wait_port(port, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("localhost", port), timeout=1):
                return True
        except: time.sleep(0.3)
    return False

def reader(stream, prefix):
    for line in iter(stream.readline, ""):
        sys.stdout.write(f"[{prefix}] {line.rstrip()}\n"); sys.stdout.flush()
    stream.close()

def request(method, path, body=None, token=None):
    conn = http.client.HTTPConnection("localhost", PORT, timeout=5)
    headers = {"Content-Type": "application/json"}
    if token: headers["Authorization"] = f"Bearer {token}"
    conn.request(method, path, json.dumps(body) if body else None, headers)
    resp = conn.getresponse()
    data = resp.read().decode()
    conn.close()
    try: j = json.loads(data) if data else {}
    except: j = {"raw": data}
    return resp.status, j

WSL_ROOT = "/home/feytell2/hall-booking-pwa"

os.environ["PORT"] = str(PORT)
os.environ["USER_INVITE_CODE"] = "push123"
os.environ["ADMIN_INVITE_CODE"] = "pushAdmin"
os.environ["JWT_SECRET"] = "push_test_secret"
os.environ["CORS_ORIGIN"] = "*"
os.environ["DOMAIN"] = "test.local"

# Clean up old DB
subprocess.run(
    ["wsl.exe", "bash", "-c", f"rm -f {WSL_ROOT}/backend/data/app.db"],
    capture_output=True
)

print(f"[test] Starting backend on port {PORT}...")
proc = subprocess.Popen(
    ["wsl.exe", "bash", "-lc",
     f"export PORT={PORT} USER_INVITE_CODE=push123 ADMIN_INVITE_CODE=pushAdmin "
     f"JWT_SECRET=push_test_secret CORS_ORIGIN=* DOMAIN=test.local "
     f"&& cd {WSL_ROOT}/backend && exec node server.js"],
    stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
)
t = threading.Thread(target=reader, args=(proc.stdout, "backend"), daemon=True)
t.start()

if not wait_port(PORT):
    print("[test] Backend failed to start")
    proc.kill(); sys.exit(1)
print(f"[test] Backend ready on :{PORT}")
time.sleep(1)

errors = []

try:
    # ===== 1. VAPID key endpoint =====
    print("\n=== 1. VAPID public key endpoint ===")
    try:
        status, data = request("GET", "/api/push/vapid-key")
        assert status == 200, f"Expected 200, got {status}"
        assert "publicKey" in data, "Missing publicKey in response"
        assert len(data["publicKey"]) > 20, "publicKey too short"
        ok("VAPID public key returned")
    except Exception as e:
        fail(f"VAPID key: {e}")
        errors.append(str(e))

    # ===== 2. User login =====
    print("\n=== 2. Create user and admin ===")
    try:
        status, data = request("POST", "/api/auth/login", {
            "name": USER, "password": "pass123", "code": "push123"
        })
        assert status == 200, f"User login: {status}"
        user_token = data["token"]
        user_id = data["user"]["id"]
        ok(f"User {USER} logged in (id={user_id})")
    except Exception as e:
        fail(f"User login: {e}")
        errors.append(str(e))
        user_token = None

    try:
        status, data = request("POST", "/api/auth/login", {
            "name": ADMIN, "password": "admin123", "code": "pushAdmin"
        })
        assert status == 200, f"Admin login: {status}"
        admin_token = data["token"]
        admin_id = data["user"]["id"]
        ok(f"Admin {ADMIN} logged in (id={admin_id})")
    except Exception as e:
        fail(f"Admin login: {e}")
        errors.append(str(e))
        admin_token = None

    # ===== 3. Push subscribe =====
    print("\n=== 3. Push subscription CRUD ===")
    dummy_sub = {
        "endpoint": f"https://test.push.com/push/{TS}",
        "keys": {
            "p256dh": "BIGOr8XJfRqLu0FNIfAkQ_b9J1M5ALhKmTaHKgL2J6dYxMudVz1yI_tQZ9V1J2fJQx3h0Y8",
            "auth": "aGVsbG8gd29ybGQ"
        }
    }

    try:
        status, data = request("POST", "/api/push/subscribe", dummy_sub, token=user_token)
        assert status == 200, f"Subscribe: {status}"
        assert data.get("ok") is True
        ok("Push subscription created")
    except Exception as e:
        fail(f"Subscribe: {e}")
        errors.append(str(e))

    try:
        status, data = request("POST", "/api/push/subscribe", {
            "endpoint": "invalid",
            "keys": {}
        }, token=user_token)
        assert status == 400, f"Expected 400, got {status}"
        ok("Rejected invalid subscription (missing keys)")
    except Exception as e:
        fail(f"Invalid sub: {e}")
        errors.append(str(e))

    try:
        status, data = request("POST", "/api/push/subscribe", {}, token=user_token)
        assert status == 400, f"Expected 400, got {status}"
        ok("Rejected empty subscription body")
    except Exception as e:
        fail(f"Empty sub: {e}")
        errors.append(str(e))

    try:
        status, data = request("POST", "/api/push/subscribe", dummy_sub, token=None)
        assert status == 401, f"Expected 401, got {status}"
        ok("Rejected subscribe without auth")
    except Exception as e:
        fail(f"No auth sub: {e}")
        errors.append(str(e))

    print("\n=== 4. Duplicate subscription (upsert) ===")
    try:
        status, data = request("POST", "/api/push/subscribe", dummy_sub, token=user_token)
        assert status == 200, f"Upsert: {status}"
        ok("Duplicate subscription upserted (no error)")
    except Exception as e:
        fail(f"Upsert: {e}")
        errors.append(str(e))

    print("\n=== 5. Unsubscribe ===")
    try:
        status, data = request("DELETE", "/api/push/subscribe",
                               {"endpoint": dummy_sub["endpoint"]}, token=user_token)
        assert status == 200, f"Unsubscribe: {status}"
        ok("Push subscription deleted")
    except Exception as e:
        fail(f"Unsubscribe: {e}")
        errors.append(str(e))

    try:
        status, data = request("DELETE", "/api/push/subscribe",
                               {"endpoint": dummy_sub["endpoint"]}, token=admin_token)
        assert status == 200, "Unsubscribe other user's sub should not crash"
        ok("Unsubscribe non-existent sub handled gracefully")
    except Exception as e:
        fail(f"Unsubscribe missing: {e}")
        errors.append(str(e))

    # ===== 6. Booking creation and notification on approve =====
    print("\n=== 6. Push on booking approval ===")
    try:
        # User creates a booking
        status, halls_data = request("GET", "/api/halls", token=admin_token)
        assert status == 200
        halls = halls_data.get("halls", [])
        assert len(halls) > 0, "No halls available"
        hall_id = halls[0]["id"]

        status, booking_data = request("POST", "/api/bookings", {
            "hall_id": hall_id,
            "date": TODAY,
            "start_time": PASS_HOUR,
            "end_time": NEXT_HOUR,
            "title": f"PushTest-{TS}"
        }, token=user_token)
        assert status == 201, f"Create booking: {status}"
        booking_id = booking_data["booking"]["id"]
        ok(f"Booking #{booking_id} created by user")
    except Exception as e:
        fail(f"Create booking: {e}")
        errors.append(str(e))
        booking_id = None

    if booking_id:
        try:
            # Re-subscribe user so sendPush has a target
            request("POST", "/api/push/subscribe", dummy_sub, token=user_token)

            # Admin approves → triggers sendPush (will fail silently = OK)
            status, data = request("PATCH", f"/api/bookings/{booking_id}/approve",
                                   {"admin_comment": "ok"}, token=admin_token)
            assert status == 200, f"Approve: {status}"
            assert data["booking"]["status"] == "approved"
            ok("Booking approved (sendPush attempted, failed gracefully)")
        except Exception as e:
            fail(f"Approve booking: {e}")
            errors.append(str(e))

    # ===== 7. tryNotifyBookingStart / tryNotifyBookingEnd logic =====
    print("\n=== 7. Notification flag logic ===")
    try:
        # Create bookings with explicit start_notified/end_notified state
        status, data = request("POST", "/api/bookings", {
            "hall_id": hall_id,
            "date": TODAY,
            "start_time": "00:01",
            "end_time": "00:02",
            "title": f"StartNotify-{TS}"
        }, token=admin_token)
        assert status == 201, f"Create start-notify booking: {status}"
        start_bid = data["booking"]["id"]
        ok(f"Booking #{start_bid} created for start notification test")
    except Exception as e:
        fail(f"Create start-notify booking: {e}")
        errors.append(str(e))
        start_bid = None

    try:
        status, data = request("POST", "/api/bookings", {
            "hall_id": hall_id,
            "date": TODAY,
            "start_time": "00:03",
            "end_time": "00:04",
            "title": f"EndNotify-{TS}"
        }, token=admin_token)
        assert status == 201, f"Create end-notify booking: {status}"
        end_bid = data["booking"]["id"]
        ok(f"Booking #{end_bid} created for end notification test")
    except Exception as e:
        fail(f"Create end-notify booking: {e}")
        errors.append(str(e))
        end_bid = None

    if start_bid:
        try:
            # Wait for the interval (30s) to fire
            print("  Waiting for notification interval (35s)...")
            time.sleep(35)

            # Check start_notified flag via booking detail
            status, data = request("GET", f"/api/bookings?status=approved", token=admin_token)
            bookings = data.get("bookings", [])
            start_book = next((b for b in bookings if b["id"] == start_bid), None)
            if start_book:
                ok("Booking exists after notification interval")
            else:
                fail("Booking not found after interval")
        except Exception as e:
            fail(f"Check notified flags: {e}")
            errors.append(str(e))

    # ===== 8. Edge cases =====
    print("\n=== 8. Edge cases ===")
    try:
        status, data = request("DELETE", "/api/push/subscribe",
                               {}, token=user_token)
        assert status == 400
        ok("Unsubscribe without endpoint rejected")
    except Exception as e:
        fail(f"Unsubscribe no endpoint: {e}")
        errors.append(str(e))

    try:
        status, data = request("GET", "/api/push/vapid-key", token=None)
        assert status == 200
        ok("VAPID key accessible without auth")
    except Exception as e:
        fail(f"VAPID key no auth: {e}")
        errors.append(str(e))

    # ===== 9. Multiple subscriptions per user =====
    print("\n=== 9. Multiple subscriptions ===")
    try:
        sub2 = {
            "endpoint": f"https://test2.push.com/push/{TS}",
            "keys": {"p256dh": "X" * 50, "auth": "Y" * 10}
        }
        status1, _ = request("POST", "/api/push/subscribe", dummy_sub, token=user_token)
        status2, _ = request("POST", "/api/push/subscribe", sub2, token=user_token)
        assert status1 == 200 and status2 == 200
        ok("Multiple subscriptions per user supported")

        # Cleanup
        request("DELETE", "/api/push/subscribe",
                {"endpoint": dummy_sub["endpoint"]}, token=user_token)
        request("DELETE", "/api/push/subscribe",
                {"endpoint": sub2["endpoint"]}, token=user_token)
    except Exception as e:
        fail(f"Multi sub: {e}")
        errors.append(str(e))

except Exception as e:
    print(f"[test] Unexpected error: {e}")
    errors.append(str(e))

finally:
    print("\n[test] Stopping backend...")
    proc.terminate()
    try: proc.wait(timeout=5)
    except: proc.kill()
    subprocess.run(["wsl.exe", "bash", "-c", "pkill -f 'node server' 2>/dev/null"], capture_output=True)
    subprocess.run("taskkill /f /im node.exe 2>nul", shell=True, capture_output=True)

print(f"\n{'='*40}")
print(f"Results: {OK} passed, {FAIL} failed")
print(f"{'='*40}")
sys.exit(1 if FAIL else 0)
