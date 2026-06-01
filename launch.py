"""
LG LifeCycle - 앱 실행기
이 파일을 Python으로 실행하면 백엔드와 프론트엔드가 모두 시작됩니다.
"""
import subprocess
import sys
import os
import time
import webbrowser
from pathlib import Path

ROOT     = Path(__file__).parent
BACKEND  = ROOT / "backend"
FRONTEND = ROOT / "frontend"
PYTHON   = sys.executable


def kill_port(port: int):
    """해당 포트를 점유한 프로세스 종료."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True, text=True
        )
        for line in result.stdout.splitlines():
            if f":{port} " in line and "LISTENING" in line:
                parts = line.split()
                pid = parts[-1]
                if pid.isdigit() and pid != "0":
                    subprocess.run(["taskkill", "/F", "/PID", pid],
                                   capture_output=True)
                    print(f"      포트 {port} 정리 완료 (PID {pid})")
    except Exception:
        pass


print("=" * 50)
print("  LG LifeCycle Decision Check")
print("=" * 50)
print()

# 기존 프로세스 정리
print("이전 프로세스 정리 중...")
kill_port(8000)
kill_port(3000)
time.sleep(2)

# 백엔드 시작
print("[1/2] 백엔드 서버 시작 중... (port 8000)")
backend_proc = subprocess.Popen(
    [PYTHON, str(BACKEND / "run.py")],
    cwd=str(BACKEND),
    env={**os.environ, "PYTHONPATH": str(BACKEND)},
)
time.sleep(4)

if backend_proc.poll() is not None:
    print("ERROR: 백엔드 시작 실패.")
    input("Enter 키를 누르면 종료...")
    sys.exit(1)
print("      백엔드 OK -> http://localhost:8000/docs")

# 프론트엔드 시작
print("[2/2] 프론트엔드 시작 중... (port 3000)")
npm = "npm.cmd" if sys.platform == "win32" else "npm"
frontend_proc = subprocess.Popen(
    [npm, "run", "start"],
    cwd=str(FRONTEND),
    shell=False,
)
time.sleep(5)
print("      프론트엔드 OK -> http://localhost:3000")
print()
print("=" * 50)
print("  브라우저에서 http://localhost:3000 접속!")
print("  종료하려면 이 창에서 Ctrl+C")
print("=" * 50)

webbrowser.open("http://localhost:3000")

try:
    backend_proc.wait()
except KeyboardInterrupt:
    print("\n서버를 종료합니다...")
    backend_proc.terminate()
    frontend_proc.terminate()
