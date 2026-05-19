export default {
  app: {
    title: "WSL Manager",
  },
  sidebar: {
    distributions: "Distributions",
  },
  distributions: {
    title: "Distributions",
    loading: "Loading WSL distributions...",
    noWsl: "No WSL distributions found. Install one with",
    install: ".",
    name: "Name",
    state: "State",
    version: "Version",
    actions: "Actions",
    start: "Start",
    stop: "Stop",
    default: "Default",
  },
  error: {
    title: "Something went wrong",
    message: "The app encountered an unexpected error. Please try refreshing the page.",
  },
} as const;
