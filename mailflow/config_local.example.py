"""复制为 config_local.py 并填入真实值。config_local.py 不会进仓库。"""
from pathlib import Path

ACCOUNT = "you@gmail.com"
RECIPIENT = "her@example.com"
INBOX_DIR = Path("/Users/you/Desktop/Requests")
WORK_DIR = Path("/Users/you/Documents/ask-work")
# AUTO_SEND = True

# 这条流程具体做哪类事（分类的类型、给两个模型的说明、回信的主题）也写在这里：
# REQUEST_TYPES = [...]
# TRIAGE_GUIDE = "..."
# GENERATE_PROMPT = """..."""   # 可用 {work} {folder} {triage}
# REPLY_SUBJECT = "..."
# REPLY_FOOTER = "..."
