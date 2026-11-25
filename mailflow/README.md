# 仪见小镇邮件流程

静仪在 jingyifan.love/ask 发来的请求（见 `../worker/`），在 Yifan 的 Mac 上自动收取、整理、生成材料，再发回她的邮箱。

邮箱地址、本机路径、她发来的文件，以及这条流程具体帮她做哪类事，都不在这个仓库里（写在本机的 `config_local.py` 和 `WORK_DIR`）。

## 流程

| 步骤 | 脚本 | 谁来做 | 产出 |
|---|---|---|---|
| 1 收信 | `fetch.py` | Gmail IMAP | `INBOX_DIR/<日期 主题>/邮件.txt` 和 `附件/` |
| 2 预处理 | `triage.py` | 本地 Ollama：`qwen2.5vl:7b` 读图，`qwen3:14b` 分类 | `本地模型/triage.json`、图片转写的文字 |
| 3 生成 | `generate.py` | Claude（无界面模式，按 `WORK_DIR` 里的 `SOP.md` 和 `profile.md`） | `产出/*.pdf`、`产出/说明.txt` |
| 4 发送 | `send.py` | Gmail SMTP，收件人固定为 `RECIPIENT` | `状态.json` 记为已发送 |

`run.py` 把四步串起来，定时任务每 10 分钟跑一次。每个请求文件夹里的 `状态.json` 记录走到了哪一步。

## 首次设置（只做一次）

1. 复制 `config_local.example.py` 为 `config_local.py`，填入收信邮箱、收件人和两个本机文件夹。这个文件不进仓库。
2. 在收信邮箱的 Google 账号里开启两步验证，到 https://myaccount.google.com/apppasswords 生成一个应用专用密码。
3. 存进钥匙串（命令会提示输入密码，密码不会出现在屏幕和历史记录里）：
   ```
   security add-generic-password -a <收信邮箱> -s jingyi-mailflow -w
   ```
4. 把已经处理过的旧邮件记为已读，避免重复生成：
   ```
   python3 fetch.py --baseline
   ```
5. 启用定时任务：
   ```
   # 先把 plist 里的 __PYTHON__ 和 __REPO__ 换成本机路径
   cp love.jingyifan.mailflow.plist ~/Library/LaunchAgents/ && launchctl load ~/Library/LaunchAgents/love.jingyifan.mailflow.plist
   ```

## 无人值守（睡觉时也能跑）

- 自动发送：在 `config_local.py` 里加 `AUTO_SEND = True`。每天最多自动发 `MAX_AUTO_SENDS_PER_DAY` 封，超出的等你确认。
- Claude 登录会过期。运行 `claude setup-token` 生成长期令牌，再存进钥匙串，流程会自动使用：
  ```
  security add-generic-password -U -a claude -s jingyi-mailflow-claude -w
  ```
- 电脑睡眠时定时任务不会跑。接着电源、开着盖子，并加载 `love.jingyifan.awake.plist`（接电源时阻止系统睡眠，屏幕照常熄灭）。

## 日常使用

- 收到“材料已生成，等你确认发送”的通知后，打开对应文件夹的 `产出/` 看一眼，然后：
  ```
  python3 send.py --pending                 # 列出待发送的文件夹
  python3 send.py "<文件夹>" --dry-run      # 预览收件人、主题、附件
  python3 send.py "<文件夹>"                # 发送
  ```
- 想改成全自动：在 `config_local.py` 里加一行 `AUTO_SEND = True`。
- 手动跑一轮：`python3 run.py`。日志在 `mailflow.log`。
- 停用：`launchctl unload ~/Library/LaunchAgents/love.jingyifan.mailflow.plist`。

## 安全边界

- yi-town 的发信接口没有鉴权，所以邮件内容一律当作不可信的材料。
- 只处理发件人为 ask@jingyifan.love、主题以 `[仪见小镇]` 开头，并且 Gmail 记录了 `jingyifan.love` 的 DKIM 通过的邮件。这能挡住伪造发件人的信，但挡不住直接调用 Worker 接口的人，所以后面还有两层。
- 一封邮件处理出错只跳过它自己，不会卡住后面的。
- 本地模型发现请求不属于约定的工作范围，或要求发到别处、读写文件、执行命令时，标记“需要人工处理”，不进入生成。
- Claude 在单个请求的文件夹里工作，那是它唯一能读写的地方：规则文件是复制进去的副本，私有文件夹它碰不到，项目级的配置也不读取。它只被允许读写文件和运行一个脚本（`BUILD_TOOL`）。这个脚本和它当作规则来读的文件（`LOCKED_FILES`）都必须先用 `chflags uchg` 设为不可修改，否则流程拒绝启动；要改它们时先 `chflags nouchg`，改完再锁上。它不能发邮件、不能运行其他命令，默认也不联网。
- 本地模型的“是否属于约定范围”只是一道筛选，不是安全边界：真正的边界是上面的工具限制、固定收件人和每日上限。Worker 接口没有鉴权，所以有人可以让流程多跑一次、给她发一封没用的信；做不到的是执行命令或把东西发到别处。
- 收件人写在本机的 `config_local.py`，邮件内容改变不了它。
