手机端 termux内运行`sshd`

电脑端：`ssh -p 8022 u0_a267@192.168.1.5`

查用户名 `whoami`

查ip  `ifconfig`

然后
```bash
### 回到已有会话
tmux attach -t fileserver

tmux new -s fileserver
cd ~/filebrowser
python app.py
```

启动后按 `Ctrl+B` 再按 `D` 脱离。这样服务在后台跑，

