module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getTags",
        handler: "tag.getTags",
        config: {
            auth: false,
          },
      },
      {
        method: "POST",
        path: "/addTag",
        handler: "tag.addTag",
        config: {
            auth: false,
          },
      },
      {
        method: "POST",
        path: "/removeTag",
        handler: "tag.removeTag",
        config: {
            auth: false,
          },
      },
      {
        method: "POST",
        path: "/combineTags",
        handler: "tag.combineTags",
        config: {
            auth: false,
          },
      },
      {
        method: "POST",
        path: "/purgeTags",
        handler: "tag.purgeTags",
        config: {
            auth: false,
          },
      },
    ],
  }