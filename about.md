<style>
/* ===== 移动端适配 ===== */
@media screen and (max-width: 768px) {
  body.typora-export {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  /* 表格横向滚动 */
  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
  }
  /* 代码块不溢出 */
  pre, code {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    word-break: break-all;
  }
  /* 图片自适应 */
  img {
    max-width: 100%;
    height: auto;
  }
  /* 标题字号缩小 */
  h1 { font-size: 1.5rem !important; }
  h2 { font-size: 1.25rem !important; }
  h3 { font-size: 1.1rem !important; }
}
</style>

<a href="index.html" style="position: fixed; top: 20px; left: 20px; text-decoration: none; color: #333; font-weight: bold; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;">⬅ 返回首页</a>

# 关于我

我是一名正在学习和成长的开发者，对技术充满热情，正在不断提升自己的技能。如果您有任何问题或建议，欢迎联系我！

<!-- 引入悬浮目录脚本（Typora 导出 HTML 时会保留此行） -->
<script src="assets/toc.js"></script>

## 联系方式

- **手机号**: +86 176 33088 571
- **邮箱**: jinmajue@gmail.com

## 个人简介

INTJ-T，独立、长期主义、想得比做得多。

日常生活里：  
不抽烟、不喝酒、偶尔打游戏很菜。贪财好色，爱捡小便宜。    
喜欢小孩和小狗；  
享受做饭、缝衣服、整理房间这些"让生活有秩序"的小事。

写代码这件事上：  
主要用 C 和 Python，对**贴近底层**的东西有持续的好奇心——进程怎么调度、IO 怎么阻塞、内存怎么分配、并发怎么不出问题。  
比起"用框架堆功能"，更想知道"框架底下到底在干什么"。  
习惯 GDB / strace / Valgrind 这些工具一点点把问题摸出来，**享受这个过程**。

技术之外，零零散散看过一些书、走过一些路、拆过几个魔方、爬过几座山、做过几道数独——具体见底部「兴趣爱好」。

---

## 技能与专长

### 编程语言
- **C**：写得最多。指针、内存管理、结构体、宏、位运算这些熟；常用 `gcc` `make` `gdb` 调试
- **Python**：写脚本、写课设、写点小工具。FastAPI 写过完整后端
- **C++**：知道基础语法，STL 常用，模板刚入门；在慢慢啃现代 C++（智能指针 / 移动语义）
- **Java**：能看懂简单业务代码，写过课程级别的小项目

### 系统与网络编程（最近投入最多）
- 折腾过 **epoll + 线程池** 的 Reactor 模型，能讲清非阻塞 IO 和事件驱动是怎么回事
- 写过 **自研 MySQL 连接池**，踩过连接复用、自动重连、超时等待的坑
- 玩过 **多线程同步**——互斥锁、条件变量、生产者-消费者模型自己撸过
- 读过《Linux 高性能服务器编程》（游双），在读《UNIX 网络编程 卷 1》
- 工具链：`gcc` / `g++` / `make` / `cmake` / `gdb` / `valgrind` / `strace`

### 数据库
- **MySQL**：建表、索引、慢查询调过；用 C 封装过连接池
- **PostgreSQL**：FastAPI 项目里用过
- **SQLite**：嵌入式小项目里用

### 框架 / 工具 / 其他
- Python：FastAPI（主）、Django（了解）
- C 网络：Muduo 网络库（在学）
- 容器化：Docker 基本使用
- 版本控制：Git 日常使用
- 操作系统、计算机网络、数据结构这些计算机基础课都上过

---

## 项目经验

### 基于 Linux 的云盘系统
**技术栈**：C / Linux / epoll / MySQL / CMake

[GitHub 仓库](https://github.com/vestjin/GraduationDesign) · 2024 - 2025  写了一个能扛数千并发的网盘后端。

- **网络层**：epoll 非阻塞 IO + 自研线程池（互斥锁 + 条件变量同步任务队列）做 Reactor
- **MySQL 连接池**：自己撸的，支持连接复用、自动重连、超时等待
- **文件传输**：`sendfile` 零拷贝优化大文件下载；MD5 秒传 + 分片断点续传
- **安全**：Token 身份认证、密码 SHA256 加盐、SQL 注入防护
- **存储**：文件夹树形管理 + 用户配额
- **工程化**：CMake 多模块构建，GDB / Valgrind 排查内存与并发问题

### 恒温控制系统
**技术栈**：C (Keil) / Python / Tkinter / SQLite · 2023-2024 学期

[GitHub 仓库](https://github.com/vestjin/temperature-control-system) · 2023 - 2024

上下位机协作的小项目。下位机用 Keil C 写单片机串口初始化与温度采集；上位机用 Python Tkinter 做界面、Dash 画实时图表、SQLite 存数据。算是第一次完整走通"嵌入式 + 上位机"的协作流程。


### 个人导航页 (nav)
**技术栈**：HTML / CSS / 原生 JavaScript (PWA) 

[GitHub 仓库](https://github.com/vestjin/nav) ·  2026.3

一个跑在自己浏览器里的"个人门户"。默认书签分常用 / 开发 / 学习 / 工具四类，支持添加、搜索、导入导出、刷新抓取。技术上折腾了这些：

- **PWA + 离线**：完整 `manifest.webmanifest` + `sw.js` Service Worker，可"添加到主屏幕"当 App 用
- **自动抓取**：用 Google favicon 服务 + CORS 代理（allorigins / codetabs / corsproxy）自动拉页面 `<title>` 和图标，结果缓存 7 天
- **云同步**：通过 GitHub Gist 跨设备同步书签列表，Token + Gist ID 配一次就够
- **交互细节**：分类可折叠 / 拖动排序、卡片可拖动、内置 Bing / Google / DDG / Yandex 网页搜索


### repo2md
**技术栈**：HTML / CSS / 原生 JavaScript 

[GitHub 仓库](https://github.com/vestjin/repo2md) · 2025 年底

把一整个项目文件夹喂给 AI 之前的预处理工具。选一个目录，自动过滤 `.git` / `node_modules` / 编译产物等无关文件，按后缀勾选要打包的文件，生成一份带目录树和文件内容的 markdown，可以复制或下载。

- **兼容性**：优先用新版 `showDirectoryPicker` API；不支持的浏览器自动降级到 `webkitdirectory` 传统模式
- **二进制识别**：扩展名黑名单 + 文件头魔数（PDF / PNG / JPEG / ZIP / GZIP）双重判定，自动跳过
- **大文件友好**：流式读取（`File.stream()` + `TextDecoder`），扫描和生成过程都带进度提示
- **安全提示**：检测到 `.env` / `id_rsa` / `password` 等敏感词会弹窗提醒



### 文件批量重命名工具
**技术栈**：Python / Tkinter / tkinterdnd2 · 2024.8


桌面端的批量文件重命名工具，v2.0 版本支持拖拽、递归、撤销与备份。用 Tkinter 写的界面，重点打磨了"批量操作的安全性"：

- **四种重命名模式**：查找替换、添加前缀/后缀、序号重命名（可设起始序号和位数）
- **实时预览 + 冲突检测**：防抖刷新预览，按目录分组检测组内重名、与磁盘已有文件冲突、非法字符，用颜色标签区分状态（有效/冲突/无效/丢失）
- **安全兜底**：执行前自动备份到 `.rename_backup` 目录，支持一键撤销上次批量操作
- **导入方式多样**：`tkinterdnd2` 拖拽（未安装自动降级）、文件夹递归遍历、剪贴板多行路径粘贴
- **可用性细节**：按扩展名/类型筛选，点击列头或下拉排序（名称/大小/修改时间），大文件 stat 信息缓存


---

## 教育背景

- **学校**: 河北科技大学
- **专业**: 计算机科学与技术
- **时间**: 2021.9 - 2026.6
- **学位**: 工学学士

## 兴趣爱好

> 这部分我写得比较细，留给愿意读到这里的人。

### 物质上的喜好
- 饮料：绿茶
- 水果：榴莲
- 颜色：蓝色
- 零食：铜锣烧红豆、菠萝包、春光椰子糖、大白兔奶糖、口香糖、饴糖

### 精神上的偏好
- 兴趣：读书、魔方、塔罗牌、数独、爬山
- 独处：冥想、做饭、缝衣服、刷鞋洗衣服、打扫屋子、整理东西
- 放松：出外散步、吃辣、洗冷热交替澡、水下憋气
- 喜欢的小说：《蛊真人》
- 喜欢的游戏：口袋妖怪、Plants vs. Zombies
- 喜欢的动画片：《哆啦 A 梦》

### 想养但还没养的
- 虹之玉（多肉）、巴西龟、金丝熊

### 偶像与佩服的人
- 偶像：齐静春、费曼、马斯克
- 不知滋味，感同身受的人：张炘炀
- 佩服的人：曹操

### 审美
- 八木莉可子、泽尻英龙华、小池里奈、小仓优子

### 一些个人印记
- 信仰：自己教
- 口头禅："过了那个年纪了。"

### 值得思考的事
- 柳天然人性实验
- Marina Abramovic 行为艺术作品《节奏 0》
- 一场考试的男女分考场插排实验

---

如果你也对这些事情感兴趣，欢迎来聊。
