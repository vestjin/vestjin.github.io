/**
 * 悬浮目录 - 自动从 H2/H3 提取章节
 * 用法：在 markdown 中引入 <script src="assets/toc.js"></script>
 * Typora 导出 HTML 时会保留外部 script 标签
 */
(function () {
    'use strict';

    var styleInjected = false;
    function injectStyle() {
        if (styleInjected) return;
        styleInjected = true;
        var css = [
            '#floating-toc {',
            '    position: fixed;',
            '    top: 80px;',
            '    right: 20px;',
            '    width: 200px;',
            '    max-height: calc(100vh - 120px);',
            '    overflow-y: auto;',
            '    padding: 12px 14px;',
            '    background: rgba(255, 255, 255, 0.92);',
            '    backdrop-filter: blur(8px);',
            '    -webkit-backdrop-filter: blur(8px);',
            '    border: 1px solid rgba(173, 179, 185, 0.4);',
            '    border-radius: 8px;',
            '    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);',
            '    font-size: 0.85rem;',
            '    line-height: 1.6;',
            '    z-index: 999;',
            '    scrollbar-width: thin;',
            '}',
            '#floating-toc::-webkit-scrollbar { width: 4px; }',
            '#floating-toc::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 2px; }',
            '#floating-toc .toc-title {',
            '    font-weight: 700;',
            '    font-size: 0.9rem;',
            '    margin-bottom: 8px;',
            '    padding-bottom: 6px;',
            '    border-bottom: 1px solid rgba(173, 179, 185, 0.3);',
            '    color: #333;',
            '}',
            '#floating-toc ul { list-style: none; padding: 0; margin: 0; }',
            '#floating-toc li { margin: 0; padding: 0; }',
            '#floating-toc a {',
            '    display: block;',
            '    padding: 3px 0 3px 8px;',
            '    color: #555;',
            '    text-decoration: none;',
            '    border-left: 2px solid transparent;',
            '    transition: all 0.2s;',
            '    word-break: keep-all;',
            '}',
            '#floating-toc a:hover {',
            '    color: #2E67D3;',
            '    border-left-color: #2E67D3;',
            '    background: rgba(46, 103, 211, 0.05);',
            '}',
            '#floating-toc a.toc-h3 {',
            '    padding-left: 20px;',
            '    font-size: 0.8rem;',
            '    color: #777;',
            '}',
            '#floating-toc a.active {',
            '    color: #2E67D3;',
            '    border-left-color: #2E67D3;',
            '    font-weight: 600;',
            '    background: rgba(46, 103, 211, 0.08);',
            '}',
            '@media screen and (max-width: 1100px) {',
            '    #floating-toc {',
            '        top: 10px;',
            '        right: 10px;',
            '        width: 50px;',
            '        height: 50px;',
            '        max-height: 50px;',
            '        padding: 0;',
            '        border-radius: 50%;',
            '        overflow: hidden;',
            '        cursor: pointer;',
            '        transition: all 0.3s;',
            '    }',
            '    #floating-toc:hover, #floating-toc.expanded {',
            '        width: 220px;',
            '        max-height: 70vh;',
            '        height: auto;',
            '        border-radius: 8px;',
            '        padding: 12px 14px;',
            '        cursor: auto;',
            '    }',
            '    #floating-toc .toc-title::before {',
            '        content: "☰";',
            '        font-size: 1.4rem;',
            '        position: absolute;',
            '        top: 8px;',
            '        left: 14px;',
            '    }',
            '    #floating-toc:hover .toc-title::before,',
            '    #floating-toc.expanded .toc-title::before {',
            '        content: "目录";',
            '        font-size: 0.9rem;',
            '        position: static;',
            '    }',
            '    #floating-toc:not(:hover):not(.expanded) .toc-list { display: none; }',
            '    #floating-toc .toc-title { border-bottom: none; margin: 0; text-align: center; }',
            '}'
        ].join('\n');
        var style = document.createElement('style');
        style.textContent = css;
        document.head.appendChild(style);
    }

    function buildTOC() {
        // Typora 导出的内容在 #write 里；普通 md 转 html 可能在 main/article/body
        var write = document.getElementById('write') ||
                    document.querySelector('main') ||
                    document.querySelector('article') ||
                    document.body;
        if (!write) return;

        var headings = write.querySelectorAll('h2, h3');
        if (headings.length === 0) return;

        // 避免重复创建
        if (document.getElementById('floating-toc')) return;

        injectStyle();

        var nav = document.createElement('nav');
        nav.id = 'floating-toc';

        var title = document.createElement('div');
        title.className = 'toc-title';
        title.textContent = '目录';
        nav.appendChild(title);

        var list = document.createElement('ul');
        list.className = 'toc-list';
        headings.forEach(function (h) {
            if (!h.id) return;
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = '#' + h.id;
            a.className = 'toc-' + h.tagName.toLowerCase();
            a.textContent = h.textContent;
            a.dataset.target = h.id;
            li.appendChild(a);
            list.appendChild(li);
        });
        nav.appendChild(list);
        document.body.appendChild(nav);

        // 小屏：点击展开
        nav.addEventListener('click', function (e) {
            if (window.innerWidth <= 1100) {
                nav.classList.toggle('expanded');
            }
        });

        // 滚动时高亮当前章节
        var links = nav.querySelectorAll('a');
        function updateActive() {
            var scrollY = window.scrollY + 120;
            var current = null;
            headings.forEach(function (h) {
                if (h.getBoundingClientRect().top + window.scrollY <= scrollY) {
                    current = h;
                }
            });
            links.forEach(function (a) {
                a.classList.toggle('active', current && a.dataset.target === current.id);
            });
        }
        window.addEventListener('scroll', updateActive, { passive: true });
        updateActive();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildTOC);
    } else {
        buildTOC();
    }
})();
