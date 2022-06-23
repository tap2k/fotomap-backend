module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getAvatar",
        handler: "avatar.getAvatar",
      },
      {
        method: "POST",
        path: "/uploadAvatar",
        handler: "avatar.uploadAvatar",
      },
    ],
  }