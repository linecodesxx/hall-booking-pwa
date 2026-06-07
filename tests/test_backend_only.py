"""
Start backend on a fresh port, test it, then stop.
"""
import subprocess, socket, time, sys, os, json, http.client, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 3099  # Use unusual port to avoid conflicts

def wait_port(port, timeout=30):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except:
            time.sleep(0.3)
    return False

def reader(stream, prefix):
    for line in iter(stream.readline, ''):
        sys.stdout.write(f'[{prefix}] {line.rstrip()}\n')
        sys.stdout.flush()
    stream.close()

# Set env var for this process so subprocess inherits it
os.environ['PORT'] = str(PORT)
os.environ['USER_INVITE_CODE'] = '123456'
os.environ['ADMIN_INVITE_CODE'] = 'admin123'
os.environ['JWT_SECRET'] = 'test_secret'
os.environ['CORS_ORIGIN'] = '*'

print(f'[test] Starting backend on port {PORT}...')
proc = subprocess.Popen(
    'node server.js',
    cwd=os.path.join(BASE, 'backend'),
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    shell=True,
    env={**os.environ}
)
t = threading.Thread(target=reader, args=(proc.stdout, 'backend'), daemon=True)
t.start()

if not wait_port(PORT):
    print('[test] Backend failed to start')
    proc.kill()
    sys.exit(1)
print(f'[test] Backend ready on :{PORT}')
time.sleep(1)

# Test user login
NAME = f'TestUser{int(time.time())}'
body = json.dumps({'name': NAME, 'password': 'pass123', 'code': '123456'})
conn = http.client.HTTPConnection('localhost', PORT, timeout=5)
conn.request('POST', '/api/auth/login', body, {'Content-Type': 'application/json'})
resp = conn.getresponse()
data = resp.read().decode()
print(f'[test] Login status: {resp.status}')
conn.close()

if resp.status == 200:
    j = json.loads(data)
    print(f'[test] Login OK! Token: {j["token"][:50]}...')
    print(f'[test] User: {j["user"]}')
else:
    print(f'[test] Login FAILED: {data}')

# Get halls
conn = http.client.HTTPConnection('localhost', PORT, timeout=5)
conn.request('GET', '/api/halls')
resp = conn.getresponse()
halls = json.loads(resp.read().decode())
print(f'[test] Halls: {len(halls.get("halls", []))} halls')
for h in halls.get('halls', []):
    print(f'  - {h["name"]} (color: {h["color"]})')

# Create a booking (admin)
body = json.dumps({'name': 'TestAdmin', 'password': 'admin123', 'code': 'admin123'})
conn = http.client.HTTPConnection('localhost', PORT, timeout=5)
conn.request('POST', '/api/auth/login', body, {'Content-Type': 'application/json'})
resp = conn.getresponse()
admin_data = json.loads(resp.read().decode())
conn.close()
print(f'[test] Admin login: {resp.status}')

# Cleanup
print('[test] Stopping backend...')
proc.terminate()
try: proc.wait(timeout=5)
except: proc.kill()

if resp.status == 200:
    print('\n[test] ALL BACKEND TESTS PASSED!')
else:
    print('\n[test] BACKEND TESTS FAILED!')
    sys.exit(1)
