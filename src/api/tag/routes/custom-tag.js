module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getTags",
        handler: "tag.getTags",
      },
      {
        method: "POST",
        path: "/addTag",
        handler: "tag.addTag",
      },
      {
        method: "POST",
        path: "/removeTag",
        handler: "tag.removeTag",
      },
      {
        method: "POST",
        path: "/combineTags",
        handler: "tag.combineTags",
      },
      {
        method: "POST",
        path: "/purgeTags",
        handler: "tag.purgeTags",
      },
    ],
  }