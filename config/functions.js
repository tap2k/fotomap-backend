// TODO: Move this somewhere else?

const { user } = require("pg/lib/defaults");

module.exports = {

  async getMyChannel(userID, uniqueID) {
      const channel = await strapi.db.query('api::channel.channel').findOne({
        select: ['id'],
        where: { 
            owner: userID,
            uniqueID: uniqueID
        },
        populate: {
          owner: {
            select: ['id'],
          },
          editors: {
            select: ['id'],
          },
          parent: {
            select: ['id'],
          },
          picture: {
            select: ['id'],
          },
        }
      });

      return channel;
  },

  async getChannel(userID, uniqueID) {
    const channel = await strapi.db.query('api::channel.channel').findOne({
      select: ['id'],
      where: { 
          uniqueID: uniqueID,
          $or: [
            {owner: userID},
            {editors: userID}
          ]
      },
      populate: {
        owner: {
            select: ['id'],
        },
        editors: {
          select: ['id'],
        },
        parent: {
          select: ['id'],
        },
        picture: {
          select: ['id'],
        },
      }
    });

    return channel;
},

  async canEdit(channel, userID) {
    return ((channel.owner?.id == userID) || channel.editors?.some(item => item.id == userID) || channel.uniqueID == "probe");
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

  async nullParam(variable, data) {
    if (data[variable] == "")
      data[variable] = null;
  },

};
