import subprocess, socket, time, sys, os, threading
from playwright.sync_api import sync_playwright, expect

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BPORT = 3099
FPORT = 5173

WSL_ROOT = '/home/feytell2/hall-booking-pwa'

os.environ['PORT'] = str(BPORT)
os.environ['USER_INVITE_CODE'] = '123456'
os.environ['ADMIN_INVITE_CODE'] = 'admin123'
os.environ['JWT_SECRET'] = 'test_key'
os.environ['CORS_ORIGIN'] = '*'
os.environ['VITE_API_URL'] = f'http://localhost:{BPORT}'
os.environ['VITE_API_PROXY'] = f'http://localhost:{BPORT}'

OK = 0
FAIL = 0
def ok(m): global OK; print(f'  OK: {m}'); OK += 1
def fail(m): global FAIL; print(f'  FAIL: {m}'); FAIL += 1

def wait_port(port, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except: time.sleep(0.3)
    return False

def reader(stream, prefix):
    for line in iter(stream.readline, ''):
        sys.stdout.write(f'[{prefix}] {line.rstrip()}\n'); sys.stdout.flush()
    stream.close()

subprocess.run(['wsl.exe', 'bash', '-c', 'pkill -9 -f "node server" 2>/dev/null; pkill -9 -f vite 2>/dev/null; sleep 0.5'], capture_output=True)
subprocess.run(['wsl.exe', 'bash', '-c', f'rm -f {WSL_ROOT}/backend/data/app.db'], capture_output=True)
subprocess.run('taskkill /f /im node.exe 2>nul', shell=True, capture_output=True)
time.sleep(1)

procs = []
try:
    print('Starting backend...')
    be = subprocess.Popen([
        'wsl.exe', 'bash', '-c',
        f'export PORT={BPORT} USER_INVITE_CODE=123456 ADMIN_INVITE_CODE=admin123 JWT_SECRET=test_key CORS_ORIGIN=* && cd {WSL_ROOT}/backend && exec node server.js'
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    procs.append(be)
    threading.Thread(target=reader, args=(be.stdout, 'be'), daemon=True).start()
    if not wait_port(BPORT): print('Backend FAILED'); sys.exit(1)
    print(f'Backend on :{BPORT}')

    print('Starting frontend...')
    fe = subprocess.Popen([
        'wsl.exe', 'bash', '-c',
        f'export VITE_API_URL=http://localhost:{BPORT} VITE_API_PROXY=http://localhost:{BPORT} && cd {WSL_ROOT}/frontend && exec npx vite --host 0.0.0.0 --port {FPORT}'
    ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    procs.append(fe)
    threading.Thread(target=reader, args=(fe.stdout, 'fe'), daemon=True).start()
    if not wait_port(FPORT): print('Frontend FAILED'); sys.exit(1)
    print(f'Frontend on :{FPORT}')
    time.sleep(2)

    TS = str(int(time.time()))
    USER = f'TUser{TS}'
    ADMIN = f'TAdmin{TS}'
    TODAY = time.strftime('%Y-%m-%d')

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ============ 1. User login + schedule ============
        print('\n1. User login + schedule')
        ctx = browser.new_context(viewport={'width': 412, 'height': 915})
        page = ctx.new_page()
        try:
            page.goto(f'http://localhost:{FPORT}')
            page.wait_for_load_state('networkidle')
            page.get_by_label('Ваше имя').fill(USER)
            page.get_by_label('Пароль').fill('pass123')
            page.get_by_label('Инвайт-код').fill('123456')
            page.get_by_role('button', name='Войти').click()
            page.wait_for_load_state('networkidle')
            page.wait_for_function('() => location.hash.includes("schedule")', timeout=15000)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1_login_schedule.png'), full_page=True)
            ok('redirected to schedule')
            halls = page.locator('.hall-card')
            ok(f'{halls.count()} hall(s) visible')

            page.get_by_role('button', name='День', exact=True).click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1_day_view.png'), full_page=True)
            ok('day view rendered')

            page.get_by_role('button', name='Неделя', exact=True).click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1_week_view.png'), full_page=True)
            ok('week view rendered')

            page.get_by_role('button', name='Месяц', exact=True).click()
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1_month_view.png'), full_page=True)
            ok('month view rendered')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1.png'))
            fail(f'login: {e}')
        ctx.close()

        # ============ 2. User creates booking ============
        print('\n2. Create booking')
        ctx = browser.new_context(viewport={'width': 412, 'height': 915})
        page = ctx.new_page()
        try:
            page.goto(f'http://localhost:{FPORT}')
            page.wait_for_load_state('networkidle')
            page.get_by_label('Ваше имя').fill(USER)
            page.get_by_label('Пароль').fill('pass123')
            page.get_by_label('Инвайт-код').fill('123456')
            page.get_by_role('button', name='Войти').click()
            page.wait_for_load_state('networkidle')
            page.wait_for_function('() => location.hash.includes("schedule")', timeout=15000)

            page.goto(f'http://localhost:{FPORT}/#/new-booking')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)
            errors = []
            page.on('pageerror', lambda err: errors.append(str(err)))
            console_msgs = []
            page.on('console', lambda msg: console_msgs.append(f'{msg.type}: {msg.text}'))
            page.reload()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(3000)
            if errors:
                for e in errors: print(f'  [js error] {e}')
            if console_msgs:
                for m in console_msgs[-10:]: print(f'  [console] {m}')
            print(f'  [html sample] {page.content()[:1000]}')
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '2_debug_new_booking.png'), full_page=True)
            page.wait_for_selector('form select', timeout=10000)
            page.select_option('select', index=1)
            page.get_by_label('Название мероприятия').fill('Auto Test Meeting')
            page.get_by_label('Комментарий').fill('E2E test')
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '2_form.png'), full_page=True)
            page.get_by_role('button', name='Создать бронь').click()
            page.wait_for_timeout(2000)
            notice = page.locator('.notice')
            expect(notice).to_be_visible()
            ok('booking created, notice shown')

            page.goto(f'http://localhost:{FPORT}/#/my-bookings')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1500)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '2_my_bookings.png'), full_page=True)
            cards = page.locator('.booking-card')
            ok(f'{cards.count()} booking card(s) in my-bookings')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '2.png'))
            fail(f'booking: {e}')
        ctx.close()

        # ============ 3. Admin login + approve ============
        print('\n3. Admin approve')
        ctx = browser.new_context(viewport={'width': 412, 'height': 915})
        page = ctx.new_page()
        try:
            page.goto(f'http://localhost:{FPORT}')
            page.wait_for_load_state('networkidle')
            page.get_by_label('Ваше имя').fill(ADMIN)
            page.get_by_label('Пароль').fill('admin123')
            page.get_by_label('Инвайт-код').fill('admin123')
            page.get_by_role('button', name='Войти').click()
            page.wait_for_load_state('networkidle')
            page.wait_for_function('() => location.hash.includes("schedule")', timeout=15000)
            ok('admin logged in')

            page.goto(f'http://localhost:{FPORT}/#/admin/bookings')
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(1000)
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '3_admin_bookings.png'), full_page=True)
            approve = page.get_by_role('button', name='Подтвердить')
            if approve.count() > 0:
                approve.first.click()
                page.wait_for_timeout(1500)
                ok('approved a booking')
            else:
                ok('no pending bookings')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '3.png'))
            fail(f'admin: {e}')

        # ============ 4. Admin add hall ============
        print('\n4. Admin add hall')
        try:
            page.goto(f'http://localhost:{FPORT}/#/admin/halls')
            page.wait_for_load_state('networkidle')
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '4_admin_halls.png'), full_page=True)
            page.locator('form').filter(has_text='Добавить помещение').get_by_label('Название').fill('E2E Hall')
            page.locator('form').filter(has_text='Добавить помещение').get_by_label('Описание').fill('Playwright test')
            page.get_by_role('button', name='Добавить').click()
            page.wait_for_timeout(1500)
            if page.get_by_text('E2E Hall').count() > 0:
                ok('hall added')
            else:
                fail('hall not visible')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '4.png'))
            fail(f'hall: {e}')
        ctx.close()

        browser.close()

except Exception as e:
    print(f'Error: {e}')
    raise
finally:
    for p in procs:
        p.terminate()
        try: p.wait(timeout=5)
        except: p.kill()
    subprocess.run(['wsl.exe', 'bash', '-c', 'pkill -f "node server" 2>/dev/null; pkill -f vite 2>/dev/null'], capture_output=True)
    subprocess.run('taskkill /f /im node.exe 2>nul', shell=True, capture_output=True)

print(f'\n=== {OK} passed, {FAIL} failed ===')
sys.exit(1 if FAIL else 0)
