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
        path: "/deleteTag",
        handler: "tag.deleteTag",
        config: {
            auth: false,
          },
      },
    ],
  }