"""整条流程：收信 → 本地模型分类 → Claude 生成 → 通知或发送。定时任务调用这个文件。"""
import fcntl, sys, traceback
import config as C
import fetch, triage, generate, send
from datetime import date
from common import log, notify, read_status, write_status


def sent_today():
    today = f"{date.today():%Y-%m-%d}"
    return sum(1 for d in C.INBOX_DIR.iterdir() if d.is_dir()
               and read_status(d).get("stage") == "已发送"
               and read_status(d).get("updated", "").startswith(today))


def main():
    lock = open(C.LOCK_FILE, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        return  # 上一轮还在跑
    for folder in fetch.main():
        try:
            tri = triage.main(folder)
            if tri.get("needs_human"):
                write_status(folder, stage="需要人工处理")
                notify("仪见小镇：需要你看一下", f"{folder.name}：{tri.get('reason', '')}")
                continue
            stage = generate.main(folder)
            if stage == "待发送" and C.AUTO_SEND and sent_today() >= C.MAX_AUTO_SENDS_PER_DAY:
                notify("仪见小镇：今天自动发送已达上限，等你确认", folder.name)
            elif stage == "待发送" and C.AUTO_SEND:
                send.main(folder)
                notify("仪见小镇：已发送给静仪", folder.name)
            elif stage == "待发送":
                notify("仪见小镇：材料已生成，等你确认发送", folder.name)
            else:
                notify("仪见小镇：需要你看一下", folder.name)
        except Exception as e:
            log(f"出错 {folder.name}：{e}\n{traceback.format_exc()}")
            write_status(folder, stage="出错", error=str(e))
            notify("仪见小镇：处理出错", f"{folder.name}：{e}")


if __name__ == "__main__":
    sys.exit(main())
