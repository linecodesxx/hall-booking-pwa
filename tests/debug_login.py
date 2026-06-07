import http.client, json, time, sys, os
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')

D = os.path.join(os.path.dirname(__file__), 'screenshots')
os.makedirs(D, exist_ok=True)

NAME = f'DirectUser{int(time.time())}'

# ===== Direct backend test (bypass Vite) =====
print('=== Direct backend test ===')
body = json.dumps({'name': NAME, 'password': 'pass123', 'code': '123456'})
conn = http.client.HTTPConnection('localhost', 3001, timeout=5)
conn.request('POST', '/api/auth/login', body, {'Content-Type': 'application/json'})
resp = conn.getresponse()
data = resp.read().decode()
print(f'Status: {resp.status}')
print(f'Body: {data}')
conn.close()

if resp.status == 200:
    print('BACKEND DIRECT: Login OK!')
else:
    print('BACKEND DIRECT: Login FAILED')

# ===== Via browser (through Vite proxy) =====
print('\n=== Via browser (Vite proxy) ===')
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    # Direct fetch through browser
    result = page.evaluate('''
        async () => {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({name: arguments[0], password: 'pass123', code: '123456'})
            });
            const text = await res.text();
            return {status: res.status, body: text};
        }
    ''', f'BrowserUser{int(time.time())}')
    print(f'Via Vite proxy: status={result["status"]}, body={result["body"]}')

    browser.close()
