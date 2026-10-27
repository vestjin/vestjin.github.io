<!-- Google 翻译插件 -->
<div id="google_translate_element" style="position: fixed; top: 20px; right: 150px; z-index: 1000;" class="no-print"></div>
<script type="text/javascript">
    function googleTranslateElementInit() {
        new google.translate.TranslateElement({
            pageLanguage: 'zh-CN', 
            includedLanguages: 'en,zh-CN',
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE
        }, 'google_translate_element');
    }
</script>
<script type="text/javascript" src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"></script>
<style>
/* 彻底隐藏 Google 翻译的顶部工具栏 (长条框) */
.VIpgJd-ZVi9od-ORHb-OEVmcd {
    display: none !important;
}
/* 修复 Google 翻译强行给 body 和 html 添加的 top 偏移 */
html, body {
    top: 0 !important;
    margin-top: 0 !important;
}
/* 打印时隐藏不需要的元素 */
@media print {
    .no-print {
        display: none !important;
    }
}
/* ===== 移动端适配 ===== */
@media screen and (max-width: 768px) {
  body.typora-export {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }
  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
  }
  pre, code {
    max-width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    word-break: break-all;
  }
  img {
    max-width: 100%;
    height: auto;
  }
  h1 { font-size: 1.5rem !important; }
  h2 { font-size: 1.25rem !important; }
  h3 { font-size: 1.1rem !important; }
  /* 翻译按钮和打印按钮在移动端缩小 */
  #google_translate_element {
    top: 10px !important;
    right: 80px !important;
  }
}
</style>

<a href="index.html" style="position: fixed; top: 20px; left: 20px; text-decoration: none; color: #333; font-weight: bold; background: #f0f0f0; padding: 8px 12px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000;" class="no-print">⬅ 返回首页</a>
<button onclick="window.print()" style="position: fixed; top: 20px; right: 20px; color: #fff; font-weight: bold; background: #007bff; padding: 8px 12px; border: none; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); z-index: 1000; cursor: pointer;" class="no-print">⬇ 保存为 PDF</button>

# 靳马珏

> 电话：`(+86)176-33088-571`       邮箱：`17633088571@163.com`

## 基本信息

### 河北科技大学 - 本科 - 计算机科学与技术专业   (2021.9 - 2026.6) 

**出生年月**：2002/09   |   **籍贯** ：河北省邢台市  |   **身高/体重**：175cm/55kg

**民族**：汉族   |   **政治面貌**：共青团员   |   **证书：** 英语四级；普通话二级甲等；驾驶证C1

**相关课程**：数据库原理及应用，数据结构，计算机网络，操作系统，编译原理...

---

## 校园项目经历

### 毕业设计-  <u>基于Linux的云盘系统</u>  （C/Linux 系统编程 · 高并发网络服务）　🔗 [源码仓库](https://github.com/vestjin/GraduationDesign)

**技术栈**：C / Linux / epoll / MySQL / CMake / GCC / GDB

**项目描述**：基于 Linux C 语言自主开发的高性能云盘存储服务，采用 `epoll + 线程池` 的 Reactor 并发模型，单机可稳定承载数千并发连接。

**核心工作**：
- **高并发网络层**：基于 epoll 实现非阻塞 IO 事件驱动，配合自研线程池（互斥锁 + 条件变量同步任务队列）构建 Reactor 模型，避免线程频繁创建销毁开销。
- **MySQL 连接池**：自研连接池支持连接复用、自动重连与超时等待（条件变量 + 超时返回），有效缓解高并发下数据库连接瓶颈。
- **文件传输优化**：使用 `sendfile` 零拷贝技术优化大文件下载与预览，减少 CPU 与用户态/内核态内存拷贝开销；实现基于 MD5 校验的文件秒传与分片断点续传。
- **安全与存储**：用户 Token 身份认证、密码 SHA256 加盐加密存储、SQL 注入防护；实现文件夹树形管理（创建/重命名/移动/删除）及用户存储配额控制。
- **工程化**：使用 CMake 构建多模块工程，GDB 调试定位内存与并发问题，Valgrind 检测内存泄漏。

### <u>恒温控制系统</u>	2023-2024第二学期  🔗 [源码仓库](https://github.com/vestjin/temperature-control-system)

恒温控制系统由上位机和下位机组成，通过串口通信实现温度采集与控制。

- **下位机（C/嵌入式）**：使用 Keil C 完成单片机串口初始化与温度采集控制逻辑，实现上下位机串口协议通信。
- **上位机（Python）**：使用 Tkinter 设计用户界面，Dash 库绘制温度数据图表，SQLite 存储温度数据并支持历史查询。

###  鲜花商城的后端系统	2023-2024第一学期    

技术栈：Python，FastAPI， PostgreSQL, Docker使用 Python 和 FastAPI 开发 RESTful API，确保高效的数据处理和快速响应。设计 PostgreSQL 数据库结构，优化了数据存储和查询性能。通过 Docker 容器化部署数据库和应用，确保系统的一致性和可扩展性。我主要实现购物车管理和订单处理功能,用户可以将商品添加到购物车、更新数量或删除商品。支持订单创建、更新订单状态（如支付、发货、完成）以及订单历史查询。  

----

## 专业技能

- **C/C++ 编程**：熟练掌握 C/C++，理解 C++11 常用特性（智能指针、lambda、右值引用、STL 容器与算法），熟悉面向对象与 RAII 思想，注重编写清晰、高效、可维护的代码。
- **Linux 系统编程**：熟悉 Linux 下文件 IO、多线程/多进程编程、进程间通信（管道、共享内存、消息队列、信号），理解 epoll 事件驱动与 Reactor 并发模型。
- **网络编程**：熟悉 TCP/IP 协议栈与 socket 编程，掌握非阻塞 IO、IO 多路复用、零拷贝（sendfile）等技术。
- **多线程与并发**：熟悉线程池实现、互斥锁、条件变量、原子操作，了解常见死锁与竞态问题的排查与规避。
- **数据库**：熟悉 MySQL，了解 PostgreSQL、SQLite，具备连接池设计与 SQL 调优基础。
- **开发工具链**：使用 GCC/GDB/Make/CMake，了解 Valgrind 内存检测；使用 Git 进行版本管理与多人协作。
- **数据结构与算法**：掌握常用数据结构（链表、哈希表、树、图）与算法，具备正则表达式使用经验。
- **其他**：了解 Python/Java，具备跨语言协作与快速原型开发能力；良好的沟通与团队协作能力。

  

## 自我评价

- **团队协作与融入** ：在最短的时间内理解团队文化，找准自己的位置，并主动与同事建立良好的工作关系；
- **抗压与稳重** ：坚韧和冷静。压力对我而言不是阻碍，而是前进的动力。
- **认真负责**：注重细节，追求卓越，并以高标准要求自己。每一个细节、每一个流程我都会认真对待，确保工作的质量和完整性
