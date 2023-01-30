module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getAssetsForChannel",
        handler: "asset.getAssetsForChannel",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/uploadAssetToChannel",
        handler: "asset.uploadAssetToChannel",
      },
      {
        method: "POST",
        path: "/deleteAsset",
        handler: "asset.deleteAsset",
      },
      /*{
        method: "GET",
        path: "/convertAssets",
        handler: "asset.convertAssets",
      }*/
    ],
  }