import http.client, json, sys, time
sys.stdout.reconfigure(encoding='utf-8')

NAME = f'FreshUser{int(time.time())}'

print('=== Backend direct test (clean DB) ===')
body = json.dumps({'name': NAME, 'password': 'pass123', 'code': '123456'})
conn = http.client.HTTPConnection('localhost', 3001, timeout=5)
conn.request('POST', '/api/auth/login', body, {'Content-Type': 'application/json'})
resp = conn.getresponse()
data = resp.read().decode()
print(f'Status: {resp.status}')
print(f'Body: {data}')
conn.close()

if resp.status == 200:
    j = json.loads(data)
    token = j.get('token', '')
    print(f'Token: {token[:50]}...')
    print('SUCCESS!')
else:
    print('FAILED')
    sys.exit(1)
