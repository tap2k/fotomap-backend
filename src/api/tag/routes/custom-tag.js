module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getAllTags",
        handler: "tag.getAllTags",
        config: {
            auth: false,
          },
      },
      /*{
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
      },*/
    ],
  }