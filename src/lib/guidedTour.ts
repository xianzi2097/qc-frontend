import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import type { HomeSection } from '../components/home/SideBar';

/** lucide SVG path — 和侧边栏图标一致 */
const ICON: Record<string, string> = {
  home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  squareLibrary: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  library: '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
  fileText: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  graduationCap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  terminal: '<polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  code2: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
};

/** 生成带 lucide 图标的标题 HTML */
function iconTitle(icon: string, text: string) {
  return `<span style="display:inline-flex;align-items:center;gap:6px"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[icon]}</svg>${text}</span>`;
}

/**
 * 启动主页引导 Tour
 * 每步自动切换到对应页面（让用户看到真实内容），Scratch 除外（会跳转外部页面）
 * @param onSection - 切换页面的回调（来自 HomePage 的 handleSection）
 */
export function startHomePageTour(onSection: (s: HomeSection) => void) {
  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'close'],
    nextBtnText: '下一步 →',
    doneBtnText: '知道了 ✓',
    progressText: '{{current}} / {{total}}',
    allowClose: true,
    overlayColor: 'rgba(0, 0, 0, 0.45)',
    stagePadding: 6,
    stageRadius: 10,
    popoverClass: 'codenova-tour',
    popoverOffset: 14,
    disableActiveInteraction: true, // 高亮区域不可点击，防止跳乱
    smoothScroll: true,
    animate: true,
    allowKeyboardControl: true,     // ← 启用键盘：← 上一步，→ / Enter 下一步，Esc 关闭
    steps: [
      {
        element: '[data-tour="sidebar"]',
        popover: {
          title: iconTitle('home', '欢迎来到 CodeNova'),
          description: '这是左侧控制台，所有功能入口都在这里。跟着引导快速了解吧！',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '[data-tour="books"]',
        popover: {
          title: iconTitle('squareLibrary', '书架'),
          description: '你上传的所有课件都在这里，按课程分类浏览和管理。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('books'),
      },
      {
        element: '[data-tour="courses"]',
        popover: {
          title: iconTitle('library', '课程'),
          description: '创建和管理课程，老师在这里上传、编辑课件内容。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('courses'),
      },
      {
        element: '[data-tour="resources"]',
        popover: {
          title: iconTitle('fileText', '资料'),
          description: '参考资料、练习题、课件素材等教学资源。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('resources'),
      },
      {
        element: '[data-tour="docs"]',
        popover: {
          title: iconTitle('graduationCap', '产品维基'),
          description: 'C++、Python、Scratch 等编程教程，学生可以直接在线学习。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('docs'),
      },
      {
        element: '[data-tour="programming"]',
        popover: {
          title: iconTitle('terminal', '在线编程'),
          description: 'Scratch / Python / C++ 在线编辑器。点击展开可选择编程语言。',
          side: 'right',
          align: 'start',
        },
        // Scratch 不自动点击（会跳转外部页面），只高亮
      },
      {
        element: '[data-tour="downloads"]',
        popover: {
          title: iconTitle('download', '软件下载'),
          description: '常用编程工具和软件的下载链接。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('downloads'),
      },
      {
        element: '[data-tour="html-sandbox"]',
        popover: {
          title: iconTitle('code2', 'HTML 演示'),
          description: '在线 HTML 编辑器，左边写代码右边实时预览。',
          side: 'right',
          align: 'start',
        },
        onHighlightStarted: () => onSection('html-sandbox'),
      },
    ],
  });

  driverObj.drive();
}
