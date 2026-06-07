import subprocess, socket, time, sys, os, threading
from playwright.sync_api import sync_playwright

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BPORT = 3099
FPORT = 5173

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

subprocess.run('taskkill /f /im node.exe 2>nul', shell=True)
time.sleep(1)
db = os.path.join(BASE, 'backend', 'data', 'app.db')
if os.path.exists(db): os.remove(db)

procs = []
try:
    print('Starting backend...')
    be = subprocess.Popen('node server.js', cwd=os.path.join(BASE, 'backend'),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, shell=True)
    procs.append(be)
    threading.Thread(target=reader, args=(be.stdout, 'be'), daemon=True).start()
    if not wait_port(BPORT): print('Backend FAILED'); sys.exit(1)
    print(f'Backend on :{BPORT}')

    print('Starting frontend...')
    fe = subprocess.Popen('npm run dev', cwd=os.path.join(BASE, 'frontend'),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, shell=True)
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
        ctx = browser.new_context()
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
            ok('redirected to schedule')
            halls = page.locator('.hall-card')
            ok(f'{halls.count()} hall(s) visible')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '1.png'))
            fail(f'login: {e}')
        ctx.close()

        # ============ 2. User creates booking ============
        print('\n2. Create booking')
        ctx = browser.new_context()
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
            page.select_option('select', index=1)
            page.get_by_label('Дата').fill(TODAY)
            page.get_by_label('Название мероприятия').fill('Auto Test Meeting')
            page.get_by_label('Комментарий').fill('E2E test')
            page.get_by_role('button', name='Отправить заявку').click()
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)
            ok(f'URL after: {page.url.split("#")[-1]}')
            if 'my-bookings' in page.url:
                cards = page.locator('.booking-card')
                ok(f'{cards.count()} booking card(s)')
            else:
                fail('no redirect to my-bookings')
        except Exception as e:
            page.screenshot(path=os.path.join(BASE, 'tests', 'ss', '2.png'))
            fail(f'booking: {e}')
        ctx.close()

        # ============ 3. Admin login + approve ============
        print('\n3. Admin approve')
        ctx = browser.new_context()
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
            approve = page.get_by_role('button', name='Подтвердить')
            if approve.count() > 0:
                approve.first.click()
                page.wait_for_timeout(1500)
                ok('approved')
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
    subprocess.run('taskkill /f /im node.exe 2>nul', shell=True)

print(f'\n=== {OK} passed, {FAIL} failed ===')
sys.exit(1 if FAIL else 0)
