"""第 2 步：本地模型预处理。读图转文字，判断请求类型，产出 本地模型/triage.json。

python3 triage.py "<请求文件夹>"
"""
import base64, json, re, subprocess, sys, urllib.request
from pathlib import Path
import config as C
from common import log, ensure_ollama, write_status

IMG = {".png", ".jpg", ".jpeg", ".webp"}


def chat(model, prompt, images=None, fmt=None):
    msg = {"role": "user", "content": prompt}
    if images:
        msg["images"] = images
    body = {"model": model, "messages": [msg], "stream": False, "think": False,
            "options": {"temperature": 0, "num_ctx": 8192}}
    if fmt:
        body["format"] = fmt
    req = urllib.request.Request(C.OLLAMA_URL + "/api/chat", json.dumps(body).encode(),
                                 {"Content-Type": "application/json"})
    out = json.load(urllib.request.urlopen(req, timeout=900))["message"]["content"]
    return re.sub(r"<think>.*?</think>", "", out, flags=re.S).strip()


def main(folder):
    folder = Path(folder)
    out = folder / "本地模型"
    out.mkdir(exist_ok=True)
    ensure_ollama()
    mail = (folder / "邮件.txt").read_text(encoding="utf-8")
    files = sorted((folder / "附件").glob("*")) if (folder / "附件").exists() else []
    notes = []
    for f in files:
        if f.suffix.lower() in IMG:
            small = out / (f.stem + "_small.jpg")
            subprocess.run(["sips", "-Z", "1800", "-s", "format", "jpeg", str(f), "--out", str(small)],
                           capture_output=True)
            src = small if small.exists() else f
            text = chat(C.VISION_MODEL,
                        "逐字转写这张图片里的全部文字，保持原有的分段和编号，不要总结，不要补充。",
                        images=[base64.b64encode(src.read_bytes()).decode()])
            small.unlink(missing_ok=True)
            (out / (f.stem + ".txt")).write_text(text, encoding="utf-8")
            notes.append(f"【图片 {f.name} 的文字】\n{text}")
            log(f"读图完成：{f.name}（{len(text)} 字）")
        elif f.suffix.lower() == ".pdf":
            r = subprocess.run(["pdftotext", "-l", "2", str(f), "-"], capture_output=True, text=True)
            notes.append(f"【PDF {f.name} 的前两页】\n{r.stdout[:1500]}")
    schema = {"type": "object", "properties": {
        "request_type": {"type": "string", "enum": C.REQUEST_TYPES},
        "topic": {"type": "string"}, "detail": {"type": "string"},
        "summary": {"type": "string"}, "needs_human": {"type": "boolean"}, "reason": {"type": "string"}},
        "required": ["request_type", "topic", "detail", "summary", "needs_human", "reason"]}
    prompt = ("下面是一封求助邮件和它的附件内容。请只做分类和提炼，输出 JSON。\n"
              + C.TRIAGE_GUIDE + "\n\n"
              f"=== 邮件 ===\n{mail}\n\n=== 附件 ===\n" + "\n\n".join(notes)[:9000])
    try:
        tri = json.loads(chat(C.TEXT_MODEL, prompt, fmt=schema))
    except Exception as e:
        tri = {"request_type": "其他", "needs_human": True, "reason": f"本地模型分类失败：{e}", "summary": ""}
    (out / "triage.json").write_text(json.dumps(tri, ensure_ascii=False, indent=1), encoding="utf-8")
    write_status(folder, stage="已分类", triage=tri)
    log(f"分类：{tri.get('request_type')}｜{tri.get('topic', '')} {tri.get('detail', '')}｜需人工={tri.get('needs_human')}")
    return tri


if __name__ == "__main__":
    print(json.dumps(main(sys.argv[1]), ensure_ascii=False, indent=1))
