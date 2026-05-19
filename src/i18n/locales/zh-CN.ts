export default {
  app: {
    title: "WSL Manager",
  },
  sidebar: {
    distributions: "发行版列表",
  },
  distributions: {
    title: "发行版列表",
    loading: "正在加载 WSL 发行版...",
    noWsl: "未找到 WSL 发行版。请使用",
    install: "安装一个。",
    name: "名称",
    state: "状态",
    version: "版本",
    actions: "操作",
    start: "启动",
    stop: "停止",
    default: "默认",
  },
  error: {
    title: "出错了",
    message: "应用遇到了一个未预期的错误。请尝试刷新页面。",
  },
} as const;
