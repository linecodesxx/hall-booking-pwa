import subprocess, socket, time, sys, os, threading

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def port_free(port):
    """Check if port is truly free by trying to connect AND checking netstat"""
    try:
        with socket.create_connection(('localhost', port), timeout=1):
            return False  # Someone accepted connection
    except:
        pass
    # Also check netstat for LISTEN state
    result = subprocess.run(
        f'netstat -ano | findstr ":{port}" | findstr "LISTENING"',
        shell=True, capture_output=True, text=True
    )
    return not result.stdout.strip()

def wait_port(port, timeout=60):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection(('localhost', port), timeout=1):
                return True
        except:
            time.sleep(0.5)
    return False

def reader(stream, prefix):
    for line in iter(stream.readline, ''):
        sys.stdout.write(f'[{prefix}] {line.rstrip()}\n')
        sys.stdout.flush()
    stream.close()

# Kill any old node processes
subprocess.run('taskkill /f /im node.exe 2>nul', shell=True)
time.sleep(2)

# Wait for port 3001 to be truly free
print('[runner] Waiting for port 3001 to be free...')
for attempt in range(30):
    if port_free(3001):
        print(f'[runner] Port 3001 is free (attempt {attempt+1})')
        break
    time.sleep(2)
else:
    # Force kill everything on port
    result = subprocess.run('netstat -ano | findstr ":3001"', shell=True, capture_output=True, text=True)
    print(f'[runner] Port still busy:\n{result.stdout[:200]}')
    sys.exit(1)

procs = []

try:
    print('[runner] Starting backend...')
    backend = subprocess.Popen(
        'node server.js',
        cwd=os.path.join(BASE, 'backend'),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True
    )
    procs.append(backend)
    t = threading.Thread(target=reader, args=(backend.stdout, 'backend'), daemon=True)
    t.start()

    if not wait_port(3001):
        print('[runner] Backend FAILED')
        sys.exit(1)
    print('[runner] Backend ready')

    time.sleep(1)

    print('[runner] Starting frontend...')
    frontend = subprocess.Popen(
        'npm run dev',
        cwd=os.path.join(BASE, 'frontend'),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        shell=True
    )
    procs.append(frontend)
    t2 = threading.Thread(target=reader, args=(frontend.stdout, 'frontend'), daemon=True)
    t2.start()

    if not wait_port(5173):
        print('[runner] Frontend FAILED')
        sys.exit(1)
    print('[runner] Frontend ready')

    time.sleep(2)

    print('\n[runner] === Running test ===')
    result = subprocess.run(
        [sys.executable, '-u', os.path.join(BASE, 'tests', 'debug_direct.py')],
        cwd=BASE
    )
    sys.exit(result.returncode)

finally:
    for p in procs:
        p.terminate()
        try: p.wait(timeout=5)
        except: p.kill()
    subprocess.run('taskkill /f /im node.exe 2>nul', shell=True)
    print('[runner] Done')
