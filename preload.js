const { TodoistApi, isSuccess } = require("@doist/todoist-api-typescript");

window.exports = {
  set_api_key: {
    mode: "list",
    args: {
      enter: (action, callbackSetList) => {
        callbackSetList([
          {
            title: "请输入API口令",
            description: "网页端打开：设置/关联应用/开发者，复制API口令",
            icon: "",
          },
        ]);
      },
      search: (action, searchWord, callbackSetList) => {
        callbackSetList([
          {
            title: "输入完成回车确认",
            description: searchWord,
            icon: "",
          },
        ]);
      },
      select: (action, itemData, callbackSetList) => {
        const apiKey = itemData.description;
        utools.dbStorage.setItem("apiKey", apiKey);
        utools.outPlugin();
      },
      placeholder: "请输入API口令",
    },
  },
  get_projects: {
    mode: "list",
    args: {
      enter: async (action, callbackSetList) => {
        const apiKey = utools.dbStorage.getItem("apiKey");
        const api = new TodoistApi(apiKey);

        callbackSetList([
          {
            title: "🌐 加载中...",
          },
        ]);
        const projects = await api.getProjects();
        const viewMap = {
          list: "列表",
          board: "看板",
          calendar: "日历",
        };
        callbackSetList(
          projects.map((i) => ({
            title: i.name,
            description: `显示方式：${viewMap[i.viewStyle]}`,
            url: i.url,
          }))
        );
      },
      select: (action, itemData, callbackSetList) => {
        window.utools.hideMainWindow();
        const url = itemData.url;
        require("electron").shell.openExternal(url);
        window.utools.outPlugin();
      },
    },
  },
  add_task: {
    mode: "none",
    args: {
      enter: ({ code, type, payload }) => {
        const apiKey = utools.dbStorage.getItem("apiKey");
        const api = new TodoistApi(apiKey);

        if (code === "add_task") {
          if (type === "over") {
            api
              .addTask({
                content: payload,
              })
              .then(() => {
                utools.showNotification("添加成功");
                utools.outPlugin();
              })
              .catch((error) => {
                console.log("error", error);
                utools.showNotification(JSON.stringify(error || "添加失败"));
              });
          }
        }
      },
    },
  },
  complete_task: {
    mode: "list",
    args: {
      enter: async (action, callbackSetList) => {
        const tasks = utools.dbStorage.getItem("tasks") || [];

        callbackSetList([
          {
            title: "刷新数据",
            description: "目前列表是缓存数据，如果没有最新数据，请选择获取",
            icon: "assets/refresh.png",
            type: "button",
          },
          ...tasks.map((i) => ({
            id: i.id,
            title: i.content,
            icon: "assets/task.png",
            type: "task",
          })),
        ]);
        return;
      },
      select: async (action, itemData, callbackSetList) => {
        const apiKey = utools.dbStorage.getItem("apiKey");
        const api = new TodoistApi(apiKey);
        if (itemData.type === "button") {
          callbackSetList([
            {
              title: "🌐 加载中...",
            },
          ]);
          const projects = await api.getProjects();
          // 目前暂时只支持显示 Inbox 中的 Task
          const inboxId = projects.find((i) => i.name === "Inbox").id;
          const tasks = await api.getTasks({
            project_id: inboxId,
          });
          utools.dbStorage.setItem("tasks", tasks);
          callbackSetList(
            tasks.map((i) => ({
              id: i.id,
              title: i.content,
              description: `${i.due?.string ?? ""} ${i.labels
                .map((i) => ` 🏷${i}`)
                .join(" ,")}`,
              icon: "assets/task.png",
              type: "task",
            }))
          );
        }

        if (itemData.type === "task") {
          api
            .closeTask(itemData.id)
            .then(() => {
              utools.showNotification(`${itemData.title} 已完成 🎉`);
              utools.hideMainWindow();
              utools.outPlugin();
            })
            .catch((error) => utools.showNotification(JSON.stringify(error)));
        }
      },
    },
  },
};
