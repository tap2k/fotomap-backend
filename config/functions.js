// TODO: Move this somewhere else?

module.exports = {

  async getChannelID(userID, uniqueID) {
      const channel = await strapi.db.query('api::channel.channel').findOne({
        select: ['id'],
        where: { 
            owner: userID,
            uniqueID: uniqueID
        },
        /*populate: {
          owner: {
              select: ['id'],
              },}*/
      });
      if (!channel)
          return 0;
      else
          return channel.id;
  },

  async deleteMediafile(id) {
    const mediafileEntry = await strapi.db.query('plugin::upload.file').findOne({
      where: { id: id },
    });
    return await strapi.plugins.upload.services.upload.remove(mediafileEntry)
  },

  async deleteBundles(asset) {
    if (asset.pcbundle)
      await strapi.config.functions.deleteMediafile(asset.pcbundle.id);
    if (asset.androidbundle)
      await strapi.config.functions.deleteMediafile(asset.androidbundle.id);
    if (asset.webglbundle)
      await strapi.config.functions.deleteMediafile(asset.webglbundle.id);
    if (asset.macbundle)
      await strapi.config.functions.deleteMediafile(asset.macbundle.id);
  },

};
