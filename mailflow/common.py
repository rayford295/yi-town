import json, subprocess, time
from datetime import datetime
import config as C


def log(msg):
    line = f"{datetime.now():%Y-%m-%d %H:%M:%S} {msg}"
    print(line, flush=True)
    with open(C.LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def password():
    r = subprocess.run(
        ["security", "find-generic-password", "-a", C.ACCOUNT, "-s", C.KEYCHAIN_SERVICE, "-w"],
        capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("钥匙串里没有应用专用密码。先运行 README 里的 security add-generic-password 命令。")
    return r.stdout.strip().replace(" ", "")


def load_state():
    if C.STATE_FILE.exists():
        return json.loads(C.STATE_FILE.read_text(encoding="utf-8"))
    return {"seen_uids": []}


def save_state(s):
    C.STATE_FILE.write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")


def read_status(folder):
    p = folder / "状态.json"
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}


def write_status(folder, **kw):
    s = read_status(folder)
    s.update(kw, updated=f"{datetime.now():%Y-%m-%d %H:%M:%S}")
    (folder / "状态.json").write_text(json.dumps(s, ensure_ascii=False, indent=1), encoding="utf-8")


def notify(title, text):
    script = f'display notification {json.dumps(text, ensure_ascii=False)} with title {json.dumps(title, ensure_ascii=False)}'
    subprocess.run(["osascript", "-e", script], capture_output=True)


def ensure_ollama():
    import urllib.request
    def up():
        try:
            urllib.request.urlopen(C.OLLAMA_URL + "/api/tags", timeout=2)
            return True
        except Exception:
            return False
    if up():
        return
    subprocess.Popen(["/opt/homebrew/bin/ollama", "serve"],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
    for _ in range(30):
        time.sleep(1)
        if up():
            return
    raise RuntimeError("Ollama 没有启动成功")
