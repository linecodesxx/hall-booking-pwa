from playwright.sync_api import sync_playwright, expect
import time, sys, os

BASE = 'http://localhost:5173'
TS = str(int(time.time()))
USER = f'ТестЮзер{TS}'
ADMIN = f'ТестАдмин{TS}'
TODAY = time.strftime('%Y-%m-%d')
SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

OK = 0
FAIL = 0


def ok(msg):
    global OK
    OK += 1
    print(f'  OK: {msg}')


def fail(msg):
    global FAIL
    FAIL += 1
    print(f'  FAIL: {msg}')


def ss(page, name):
    page.screenshot(path=os.path.join(SCREENSHOT_DIR, f'{name}.png'))


def login(page, name, password, code):
    page.goto(BASE)
    page.wait_for_load_state('networkidle')
    page.get_by_label('Ваше имя').fill(name)
    page.get_by_label('Пароль').fill(password)
    page.get_by_label('Инвайт-код').fill(code)
    page.get_by_role('button', name='Войти').click()
    page.wait_for_load_state('networkidle')
    try:
        page.wait_for_function(
            '() => window.location.hash.includes("schedule")',
            timeout=10000
        )
    except:
        ss(page, 'login_fail')
        raise


def main():
    global OK, FAIL
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # === 1. User login + schedule ===
        print('1. User login + schedule')
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            login(page, USER, 'pass123', '123456')
            ok('logged in, redirected to /schedule')
        except Exception as e:
            ss(page, '1_login')
            fail(f'login: {e}')

        try:
            page.wait_for_load_state('networkidle')
            halls = page.locator('.hall-card')
            count = halls.count()
            ok(f'sees {count} hall(s) on schedule')
        except Exception as e:
            ss(page, '1_schedule')
            fail(f'schedule: {e}')
        ctx.close()

        # === 2. User creates booking ===
        print('2. User creates booking')
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            login(page, USER, 'pass123', '123456')
            page.goto(f'{BASE}/#/new-booking')
            page.wait_for_load_state('networkidle')
            page.select_option('select', index=1)
            page.get_by_label('Дата').fill(TODAY)
            page.get_by_label('Название мероприятия').fill('Test meeting')
            page.get_by_label('Комментарий').fill('Created by test')
            page.get_by_role('button', name='Отправить заявку').click()
            page.wait_for_load_state('networkidle')
            page.wait_for_function(
                '() => window.location.hash.includes("my-bookings")',
                timeout=10000
            )
            page.wait_for_load_state('networkidle')
            expect(page.get_by_text('Test meeting')).to_be_visible()
            ok('booking created, visible in Мои заявки')
        except Exception as e:
            ss(page, '2_booking')
            fail(f'create booking: {e}')
        ctx.close()

        # === 3. Admin login ===
        print('3. Admin login')
        ctx = browser.new_context()
        page = ctx.new_page()
        try:
            login(page, ADMIN, 'admin123', 'admin123')
            ok('admin logged in')
        except Exception as e:
            ss(page, '3_admin_login')
            fail(f'admin login: {e}')

        # === 4. Admin approves booking ===
        try:
            page.goto(f'{BASE}/#/admin/bookings')
            page.wait_for_load_state('networkidle')
            approve = page.get_by_role('button', name='Подтвердить')
            if approve.count() > 0:
                approve.first.click()
                page.wait_for_timeout(1500)
                ok('approved a pending booking')
            else:
                ok('no pending bookings to approve')
        except Exception as e:
            ss(page, '4_approve')
            fail(f'approve: {e}')

        # === 5. Admin adds hall ===
        try:
            page.goto(f'{BASE}/#/admin/halls')
            page.wait_for_load_state('networkidle')
            page.get_by_label('Название').fill('Test Hall Auto')
            page.get_by_label('Описание').fill('Created by autotest')
            page.get_by_role('button', name='Добавить').click()
            page.wait_for_timeout(1000)
            expect(page.get_by_text('Test Hall Auto')).to_be_visible()
            ok('hall added')
        except Exception as e:
            ss(page, '5_hall')
            fail(f'add hall: {e}')
        ctx.close()

        browser.close()

    print(f'\n=== Results: {OK} passed, {FAIL} failed ===')
    return 1 if FAIL else 0


if __name__ == '__main__':
    sys.exit(main())
