"""第 4 步：把 产出/ 里的 PDF 发到固定收件人。

python3 send.py "<请求文件夹>"            发送
python3 send.py "<请求文件夹>" --dry-run  只显示会发什么
python3 send.py --pending                 列出所有待发送的文件夹
"""
import smtplib, sys
from email.message import EmailMessage
from pathlib import Path
import config as C
from common import log, password, read_status, write_status


def pending():
    return [d for d in sorted(C.INBOX_DIR.iterdir())
            if d.is_dir() and read_status(d).get("stage") == "待发送"]


def main(folder, dry=False):
    folder = Path(folder)
    st = read_status(folder)
    if st.get("stage") == "已发送":
        raise SystemExit("这个文件夹已经发送过了。")
    out = folder / "产出"
    pdfs = sorted(out.glob("*.pdf"))
    if not pdfs:
        raise SystemExit("产出/ 里没有 PDF，不发送。")
    if (out / "需要人工处理.md").exists():
        raise SystemExit("存在 需要人工处理.md，先看一下再决定。")
    note = out / "说明.txt"
    body = note.read_text(encoding="utf-8").strip() if note.exists() else "材料见附件。"
    title = st.get("triage", {})
    subject = C.REPLY_SUBJECT + (f"{title.get('topic', '')} {title.get('detail', '')}".strip() or folder.name)
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = C.ACCOUNT, C.RECIPIENT, subject
    if C.CC_SELF:
        msg["Cc"] = C.ACCOUNT
    msg.set_content(body + "\n\n" + C.REPLY_FOOTER + "\n")
    for p in pdfs:
        msg.add_attachment(p.read_bytes(), maintype="application", subtype="pdf", filename=p.name)
    size = sum(p.stat().st_size for p in pdfs) / 1e6
    print(f"收件人：{C.RECIPIENT}\n主题：{subject}\n附件：{[p.name for p in pdfs]}（{size:.1f} MB）\n正文：\n{body}")
    if dry:
        return
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as s:
        s.login(C.ACCOUNT, password())
        s.send_message(msg)
    write_status(folder, stage="已发送", sent_to=C.RECIPIENT)
    log(f"已发送到 {C.RECIPIENT}：{folder.name}")


if __name__ == "__main__":
    if "--pending" in sys.argv:
        for d in pending():
            print(d)
    else:
        main(sys.argv[1], "--dry-run" in sys.argv)
