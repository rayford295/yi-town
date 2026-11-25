"""第 1 步：从 Gmail 收取仪见小镇的新邮件，每封存成 INBOX_DIR 下的一个文件夹。

python3 fetch.py             收取新邮件
python3 fetch.py --baseline  把现有邮件全部记为已处理，不下载（首次使用时运行一次）
"""
import email, imaplib, re, sys
from datetime import datetime
from email.header import decode_header, make_header
from email.utils import parsedate_to_datetime, parseaddr
import config as C
from common import log, notify, password, load_state, save_state, write_status


def dec(s):
    return str(make_header(decode_header(s or "")))


def safe(name, n=60):
    name = re.sub(r'[/\\:*?"<>|\r\n\t]+', " ", name).strip(" .")
    return name[:n] or "未命名"


def select_all_mail(connection):
    # Gmail localizes mailbox names but keeps the IMAP special-use flag.
    status, rows = connection.list()
    if status != "OK":
        raise imaplib.IMAP4.error("无法列出 Gmail 邮箱")
    mailbox = b'"[Gmail]/All Mail"'
    for row in rows:
        if row is None:
            continue
        entry = re.fullmatch(rb'\(([^)]*)\) (?:"(?:[^"\\]|\\.)*"|NIL) (.+)', row)
        if entry and rb"\all" in entry[1].lower().split():
            mailbox = entry[2]
            break
    status, _ = connection.select(mailbox, readonly=True)
    if status != "OK":
        raise imaplib.IMAP4.error("无法打开 Gmail 的「所有邮件」邮箱")


def main():
    baseline = "--baseline" in sys.argv
    state = load_state()
    seen = set(state["seen_uids"])
    M = imaplib.IMAP4_SSL("imap.gmail.com")
    M.login(C.ACCOUNT, password())
    select_all_mail(M)
    status, data = M.uid("search", None, "FROM", f'"{C.SENDER_FILTER}"')
    if status != "OK":
        raise imaplib.IMAP4.error("无法搜索 Gmail 邮件")
    uids = [u.decode() for u in data[0].split()]
    new = [u for u in uids if u not in seen]
    if baseline:
        state["seen_uids"] = uids
        save_state(state)
        log(f"baseline：{len(uids)} 封现有邮件记为已处理")
        M.logout()
        return []
    folders = []
    for uid in new:
        # 一封坏邮件不能卡住后面的：单封出错就记下并跳过，每封处理完立刻存状态。
        try:
            folder = save_message(M, uid)
            if folder:
                folders.append(folder)
        except Exception as e:
            log(f"跳过 uid={uid}：处理出错（{e}）")
        seen.add(uid)
        state["seen_uids"] = sorted(seen, key=int)
        save_state(state)
    M.logout()
    return folders


def split_results(header):
    """把一条 Authentication-Results 拆成各方法的结果（RFC 8601）。

    从左到右扫一遍，同时记着是否在引号里、注释嵌套了几层：注释和引号里的内容全部丢掉，
    只有落在最外层的分号才算分隔符。结构不完整（引号或括号没闭合）时返回 None。
    """
    parts, cur, depth, quoted, i = [], [], 0, False, 0
    while i < len(header):
        ch = header[i]
        if ch == "\\" and (quoted or depth):
            i += 2
            continue
        if quoted:
            quoted = ch != '"'
        elif depth:
            depth += (ch == "(") - (ch == ")")
        elif ch == '"':
            quoted = True
            cur.append('""')
        elif ch == "(":
            depth = 1
            cur.append(" ")
        elif ch == ")":
            return None
        elif ch == ";":
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
        i += 1
    if quoted or depth:
        return None
    parts.append("".join(cur))
    return [" ".join(p.split()).lower() for p in parts]


def authenticated(msg):
    """Gmail 收信时写在最上面的认证结果里，必须有发件域名的 DKIM 通过。

    From 头谁都能写；DKIM 通过说明这封信确实由 jingyifan.love 的发信服务（Ask Worker）发出。
    只看第一条 Authentication-Results：它是 Gmail 自己加的，邮件里自带的同名头排在它后面。
    只认 dkim 这一项自己的结果是 pass，且它的 header.i 或 header.d 恰好等于发件域名。
    """
    results = msg.get_all("Authentication-Results") or []
    if not results:
        return False
    parts = split_results(str(results[0]))
    if not parts or parts[0] != "mx.google.com":
        return False
    domain = C.SENDER_FILTER.split("@")[1].lower()
    for part in parts[1:]:
        tokens = part.split()
        if not tokens or tokens[0] != "dkim=pass":
            continue
        props = {}
        for t in tokens[1:]:
            k, sep, v = t.partition("=")
            if sep and k not in props:
                props[k] = v
        if props.get("header.i") == "@" + domain or props.get("header.d") == domain:
            return True
    return False


def save_message(M, uid):
    _, d = M.uid("fetch", uid, "(BODY.PEEK[])")
    msg = email.message_from_bytes(d[0][1])
    sender = parseaddr(msg.get("From", ""))[1].lower()
    subject = dec(msg.get("Subject"))
    if sender != C.SENDER_FILTER or not subject.startswith(C.SUBJECT_PREFIX):
        log(f"跳过 uid={uid}：发件人或主题不符（{sender} / {subject[:30]}）")
        return None
    if not authenticated(msg):
        log(f"跳过 uid={uid}：DKIM 未通过，可能是伪造的发件人")
        notify("仪见小镇：拦下一封疑似伪造的邮件", subject[:40])
        return None
    try:
        when = parsedate_to_datetime(msg["Date"]).astimezone()
    except Exception:
        when = datetime.now().astimezone()
    title = subject[len(C.SUBJECT_PREFIX):].strip()
    folder = C.INBOX_DIR / f"{when:%Y-%m-%d_%H%M} {safe(title, 40)}"
    if folder.exists():
        folder = folder.with_name(f"{folder.name} {uid}")
    att = folder / "附件"
    att.mkdir(parents=True, exist_ok=True)
    body, names = "", []
    for part in msg.walk():
        fn = part.get_filename()
        if fn:
            fn = safe(dec(fn), 120)
            (att / fn).write_bytes(part.get_payload(decode=True) or b"")
            names.append(fn)
        elif part.get_content_type() == "text/plain" and not body:
            body = (part.get_payload(decode=True) or b"").decode(
                part.get_content_charset() or "utf-8", "replace")
    (folder / "邮件.txt").write_text(
        f"主题：{subject}\n时间：{when:%Y-%m-%d %H:%M}\n附件：{'、'.join(names) or '无'}\n\n{body.strip()}\n",
        encoding="utf-8")
    write_status(folder, uid=uid, stage="已下载", subject=subject, attachments=names)
    log(f"已下载 uid={uid} → {folder.name}（附件 {len(names)} 个）")
    return folder


if __name__ == "__main__":
    for f in main():
        print(f)
