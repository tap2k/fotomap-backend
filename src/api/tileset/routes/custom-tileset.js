module.exports = {
  routes: [
    {
      method: "GET",
      path: "/getTilesets",
      handler: "tileset.getTilesets",
      config: {
          auth: false,
        },
    },
  ],
}