import subprocess
import time
import requests
import os
import signal

def run_server_and_test():
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    # Start server (use uvicorn without reload to keep a single process we can capture)
    proc = subprocess.Popen(["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--log-level", "debug"], cwd=backend_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    try:
        # Wait for server startup
        time.sleep(2)
        payload = {
            "StudentID": "RCS/142/22",
            "FirstName": "Usman",
            "LastName": "Aman",
            "Email": "usmanamanadumysister@gmail.com",
            "Department": "Civil Engineering",
            "EnrollmentYear": 2022,
            "CafeAccess": False,
            "Password": "Password123"
        }
        try:
            resp = requests.post("http://127.0.0.1:8000/api/registration/student", json=payload, timeout=10)
            print("STATUS", resp.status_code)
            print("RESPONSE", resp.text)
        except Exception as e:
            print("REQUEST ERROR:", e)
        # Read server stderr for traceback
        try:
            # give server a moment to flush logs
            time.sleep(0.5)
            _, stderr = proc.communicate(timeout=5)
            if stderr:
                print("SERVER STDERR:\n", stderr)
        except subprocess.TimeoutExpired:
            try:
                proc.kill()
            except Exception:
                pass
    finally:
        try:
            proc.terminate()
        except Exception:
            pass

if __name__ == '__main__':
    run_server_and_test()
