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
      {
        method: "POST",
        path: "/deleteAvatar",
        handler: "avatar.deleteAvatar",
      },
      /*{
        method: "GET",
        path: "/convertAvatars",
        handler: "avatar.convertAvatars",
      }*/
    ],
  }