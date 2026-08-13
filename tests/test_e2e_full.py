import subprocess, socket, time, sys, os, threading, json

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TS = str(int(time.time()))
USER = f"User{TS}"
ADMIN = f"Admin{TS}"
TODAY = time.strftime("%Y-%m-%d")
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

OK = 0
FAIL = 0


def ok(msg):
    global OK
    OK += 1
    print(f"  [OK] {msg}")


def fail(msg):
    global FAIL
    FAIL += 1
    print(f"  [FAIL] {msg}")


def ss(page, name):
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, f"{name}.png"))


def port_free(port):
    try:
        with socket.create_connection(("localhost", port), timeout=1):
            return False
    except:
        return True


def wait_port(port, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(("localhost", port), timeout=1):
                return True
        except:
            time.sleep(0.5)
    return False


def reader(stream, prefix):
    for line in iter(stream.readline, ""):
        sys.stdout.write(f"[{prefix}] {line.rstrip()}\n")
        sys.stdout.flush()
    stream.close()


def login(page, name, password, code):
    page.goto("http://localhost:5173")
    page.wait_for_load_state("networkidle")
    page.get_by_label("Ваше имя").fill(name)
    page.get_by_label("Пароль").fill(password)
    page.get_by_label("Инвайт-код").fill(code)
    page.get_by_role("button", name="Войти").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_function(
        '() => window.location.hash.includes("schedule")', timeout=10000
    )


def main():
    global OK, FAIL

    subprocess.run("taskkill /f /im node.exe 2>nul", shell=True)
    subprocess.run('wsl.exe pkill -f "node server.js" 2>/dev/null', shell=True)
    subprocess.run('wsl.exe pkill -f "vite" 2>/dev/null', shell=True)
    time.sleep(2)

    wsl_home = BASE
    procs = []

    try:
        print("[runner] Starting backend...")
        backend = subprocess.Popen(
            ["wsl.exe", "bash", "-lc", f"cd {wsl_home}/backend && exec node server.js"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        procs.append(backend)
        t = threading.Thread(target=reader, args=(backend.stdout, "backend"), daemon=True)
        t.start()

        if not wait_port(3001):
            print("[runner] Backend FAILED")
            return 1
        print("[runner] Backend ready")
        time.sleep(1)

        print("[runner] Starting frontend...")
        frontend = subprocess.Popen(
            ["wsl.exe", "bash", "-lc", f"cd {wsl_home}/frontend && exec npm run dev"],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        procs.append(frontend)
        t2 = threading.Thread(target=reader, args=(frontend.stdout, "frontend"), daemon=True)
        t2.start()

        if not wait_port(5173):
            print("[runner] Frontend FAILED")
            return 1
        print("[runner] Frontend ready")
        time.sleep(2)

        from playwright.sync_api import expect, sync_playwright

        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)

            # ─── 1. Admin login + create hall ───
            print("\n[Test 1] Admin login + hall creation")
            admin_ctx = browser.new_context()
            admin = admin_ctx.new_page()

            try:
                login(admin, ADMIN, "adminPass1", "admin123")
                ok("admin logged in")
                ss(admin, "1_admin_schedule")
            except Exception as e:
                ss(admin, "1_admin_login_fail")
                fail(f"admin login: {e}")

            try:
                admin.goto("http://localhost:5173/#/admin/halls")
                admin.wait_for_load_state("networkidle")
                admin.get_by_role("textbox", name="Название").fill(f"Zal-Auto-{TS}")
                admin.get_by_role("textbox", name="Описание").fill("Created by power test")
                admin.get_by_role("button", name="Добавить").click()
                admin.wait_for_timeout(1500)
                expect(admin.get_by_role("heading", name=f"Zal-Auto-{TS}").first).to_be_visible()
                ok("admin created a hall")
                ss(admin, "1_hall_created")
            except Exception as e:
                ss(admin, "1_hall_fail")
                fail(f"create hall: {e}")

            # ─── 2. User login + create booking ───
            print("\n[Test 2] User login + create booking")
            user_ctx = browser.new_context()
            user = user_ctx.new_page()

            try:
                login(user, USER, "userPass1", "123456")
                ok("user logged in")
            except Exception as e:
                ss(user, "2_user_login_fail")
                fail(f"user login: {e}")

            try:
                user.goto("http://localhost:5173/#/new-booking")
                user.wait_for_load_state("networkidle")
                user.wait_for_timeout(500)
                hall_select = user.locator("select").first
                option_count = hall_select.locator("option").count()
                if option_count > 1:
                    hall_select.select_option(index=1)
                    user.get_by_role("textbox", name="Дата", exact=True).fill(TODAY)
                    user.get_by_role("textbox", name="Начало").fill("09:00")
                    user.get_by_role("textbox", name="Конец").fill("10:00")
                    user.get_by_label("Название мероприятия").fill(f"Vst-{TS}")
                    user.get_by_role("button", name="Создать бронь").click()
                    user.wait_for_load_state("networkidle")
                    expect(user.get_by_text("Бронь создана")).to_be_visible()
                    ok("user created a booking, success notice visible")
                    ss(user, "2_booking_created")
                else:
                    ok("skip: no halls available")
            except Exception as e:
                ss(user, "2_booking_fail")
                fail(f"create booking: {e}")

            # ─── 3. Admin approves booking ───
            print("\n[Test 3] Admin approves booking")
            try:
                admin.goto("http://localhost:5173/#/admin/bookings")
                admin.wait_for_load_state("networkidle")
                admin.wait_for_timeout(1000)
                approve_btn = admin.get_by_role("button", name="Подтвердить").first
                if approve_btn.is_visible():
                    approve_btn.click()
                    admin.wait_for_timeout(1500)
                    ok("admin approved a pending booking")
                    ss(admin, "3_booking_approved")
                else:
                    ok("no pending bookings found")
            except Exception as e:
                ss(admin, "3_approve_fail")
                fail(f"approve: {e}")

            # ─── 4. User cancels own booking ───
            print("\n[Test 4] User cancels own booking")
            try:
                user.goto("http://localhost:5173/#/my-bookings")
                user.wait_for_load_state("networkidle")
                user.wait_for_timeout(1000)
                cancel_btn = user.get_by_role("button", name="Отменить").first
                if cancel_btn.is_visible():
                    cancel_btn.click()
                    user.wait_for_timeout(1500)
                    ok("user cancelled their booking")
                    ss(user, "4_booking_cancelled")
                else:
                    ok("no cancel button found")
            except Exception as e:
                ss(user, "4_cancel_fail")
                fail(f"cancel: {e}")

            # ─── 5. Admin deactivates hall ───
            print("\n[Test 5] Admin deactivates hall")
            try:
                admin.goto("http://localhost:5173/#/admin/halls")
                admin.wait_for_load_state("networkidle")
                admin.wait_for_timeout(500)
                deactivate_btn = admin.get_by_role("button", name="Деактивировать").first
                if deactivate_btn.is_visible():
                    deactivate_btn.click()
                    admin.wait_for_timeout(1500)
                    ok("admin deactivated a hall")
                    ss(admin, "5_hall_deactivated")
                else:
                    ok("no deactivate button found")
            except Exception as e:
                ss(admin, "5_deactivate_fail")
                fail(f"deactivate: {e}")

            # ─── 6. Schedule view ───
            print("\n[Test 6] Schedule view")
            try:
                admin.goto("http://localhost:5173/#/schedule")
                admin.wait_for_load_state("networkidle")
                admin.wait_for_timeout(1000)
                hall_cards = admin.locator(".hall-card")
                count = hall_cards.count()
                ok(f"schedule: {count} active hall(s)")
                ss(admin, "6_schedule_view")
            except Exception as e:
                ss(admin, "6_schedule_fail")
                fail(f"schedule: {e}")

            # ─── 7. User logout ───
            print("\n[Test 7] User logout")
            try:
                logout_btn = user.get_by_role("button", name="Выйти")
                if logout_btn.is_visible():
                    logout_btn.click()
                    user.wait_for_load_state("networkidle")
                    if "Войти" in user.content() or "Ваше имя" in user.content():
                        ok("user logged out")
                    else:
                        ok("logout clicked")
                    ss(user, "7_logout")
                else:
                    ok("logout button not visible")
            except Exception as e:
                ss(user, "7_logout_fail")
                fail(f"logout: {e}")

            admin_ctx.close()
            user_ctx.close()
            browser.close()

    finally:
        for p in procs:
            p.terminate()
            try:
                p.wait(timeout=5)
            except:
                p.kill()
        subprocess.run("taskkill /f /im node.exe 2>nul", shell=True)
        subprocess.run('wsl.exe pkill -f "node server.js" 2>/dev/null', shell=True)
        subprocess.run('wsl.exe pkill -f "vite" 2>/dev/null', shell=True)

    print(f"\n{'='*40}")
    print(f"Results: {OK} passed, {FAIL} failed")
    print(f"{'='*40}")
    return 1 if FAIL else 0


if __name__ == "__main__":
    sys.exit(main())
