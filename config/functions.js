// TODO: Move this somewhere else?

//const { user } = require("pg/lib/defaults");

module.exports = {
  
  async addFile(id, ref, file, key)
  {
      if (!file)
          return null;
  
      if (file) {
          let path = file.path;
          let filename = file.name;
  
          const fs = require('fs');
          const mime = require('mime');
          const mimetype = mime.getType(filename);
          const stats = fs.statSync(path);
  
          return await strapi.plugins.upload.services.upload.upload({
              data: {
                  refId: id,
                  ref: ref,
                  field: key,
              },
              files: {
                  path: path,
                  name: filename,
                  type: mimetype,
                  size: stats.size
              }
          });
      }
  },

    async getChannel(channelID, userID)
    {
        let whereclause = {};
        if (!await strapi.config.functions.canEdit(channelID, userID))
          whereclause = { publishedAt: { $ne: null } };

        return await strapi.query('api::channel.channel').findOne({
            where: { uniqueID: channelID },
            populate: {
                parent: {
                    select: ['id', 'name', 'uniqueID'],
                    populate: {
                        owner: {
                            select: ['id'],
                        },
                        editors: {
                            select: ['id', 'username', 'email'],
                        },
                    }
                },
                owner: {
                    select: ['id'],
                },
                editors: {
                    select: ['id', 'username', 'email'],
                },
                tileset: {
                    select: ['id', 'name', 'urlformatstring', 'attribution'],
                },
                picture: {
                    select: ['id', 'url', 'formats'],
                },
                overlay: {
                    select: ['id', 'tl_lat', 'tl_long', 'tr_lat', 'tr_long', 'br_lat', 'br_long', 'bl_lat', 'bl_long'],
                    populate: {
                        image: {
                            select: ['id', 'url', 'formats'],
                        }
                    }
                },
                tags: {
                    select: ['id', 'tag', 'markercolor']
                },
                children: {
                  select: ['id', 'uniqueID', 'lat', 'long'],
                  populate: {
                    picture: {
                        select: ['id', 'url', 'formats'],
                    },
                    owner: {
                      select: ['id'],
                    },
                    parent: {
                      select: ['id', 'name', 'uniqueID'],
                    },
                  },
                },
                assets: {
                  orderBy: { order: 'asc' },
                  select: ['id', 'name'],
                  populate: {
                      pcbundle: {
                          select: ['id', 'name', 'url', 'size'],
                      },
                      androidbundle: {
                          select: ['id', 'name', 'url', 'size'],
                      },
                      webglbundle: {
                          select: ['id', 'name', 'url', 'size'],
                      },
                      macbundle: {
                          select: ['id', 'name', 'url', 'size'],
                      }
                  },
                },
                contents: {
                  where: whereclause,
                  orderBy: { order: 'asc' },
                  populate: {
                      mediafile: {
                          select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                      },
                      thumbnail: {
                          select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                      },
                      channel: {
                          select: ['id', 'uniqueID', 'markercolor'],
                          populate: {
                              owner: { select: ['id'] },
                          }
                      },
                      tags: {
                          select: ['id', 'tag', 'markercolor'],
                          populate: {
                              thumbnail: { select: ['url', 'formats'] },
                          }
                      },
                  },
                }
            },
          });
    },

  async canEdit(channelID, userID) {
    if (!userID)
      return false;
    const channel = await strapi.config.functions.getChannel(channelID);
    if (!channel)
      return false;
    return ((channel.owner?.id == userID) || channel.editors?.some(item => item.id == userID) || channel.uniqueID == "probe"
    || await strapi.config.functions.canEdit(channel.parent?.uniqueID, userID));
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
