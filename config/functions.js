// TODO: Move this somewhere else?
//const { user } = require("pg/lib/defaults");

const crypto = require('crypto');
const dotenv = require('dotenv');

const HASH_LENGTH = 32
dotenv.config();

module.exports = {
  
  async calculateChannelSize(channelID) {
    // Retrieve the channel
    const channel = await strapi.db.query('api::channel.channel').findOne({
      where: { id: channelID },
      populate: {
        contents: {
          populate: {
            mediafile: {
              select: ['size'],
            }
          }
        },
        assets: {
          populate: {
            pcbundle: { select: ['size'] },
            macbundle: { select: ['size'] },
            androidbundle: { select: ['size'] },
            webglbundle: { select: ['size'] },
          }
        },
        overlays: {
          populate: {
            mediafile: { select: ['size'] },
          }
        },
        children: true,
        picture: {
          select: ['size'],
        },
        audiofile: {
          select: ['size'],
        },
      }
    });
  
    if (!channel) {
      console.error(`Channel with ID ${channelID} not found`);
      return 0;
    }
  
    let channelSize = 0;
  
    // Calculate size from picture
    if (channel.picture?.size) {
      channelSize += channel.picture.size;
    }
  
    // Calculate size from audiofile
    if (channel.audiofile?.size) {
      channelSize += channel.audiofile.size;
    }
  
    // Calculate size from contents
    channel.contents?.forEach(contentItem => {
      if (contentItem.mediafile?.size) {
        channelSize += contentItem.mediafile.size;
      }
    });
  
    // Calculate size from assets
    channel.assets?.forEach(asset => {
      if (asset.pcbundle?.size) channelSize += asset.pcbundle.size;
      if (asset.macbundle?.size) channelSize += asset.macbundle.size;
      if (asset.androidbundle?.size) channelSize += asset.androidbundle.size;
      if (asset.webglbundle?.size) channelSize += asset.webglbundle.size;
    });
  
    // Calculate size from overlays
    channel.overlays?.forEach(overlay => {
      if (overlay.mediafile?.size) {
        channelSize += overlay.mediafile.size;
      }
    });
  
    // Recursively calculate size for children
    if (channel.children && channel.children.length > 0) {
      for (const childChannel of channel.children) {
        channelSize += await this.calculateChannelSize(childChannel.id);
      }
    }
  
    //return channelSize
    const sizeInMB = Number((channelSize / (1024)).toFixed(2));
    return sizeInMB;
  },

  createPrivateID(channelID) {
    const privateSeed = process.env.PRIVATE_SEED;
    if (!privateSeed) {
      console.error('PRIVATE_SEED not set in environment variables');
      return null;
    }
    if (!channelID || channelID.length === 0) {
      console.error('Invalid channel ID');
      return null;
    }
  
    // Generate a repeating key from the private seed
    const key = Buffer.from(privateSeed.repeat(Math.ceil(channelID.length / privateSeed.length))).slice(0, channelID.length);
  
    // XOR the channelID with the key
    const privateBuffer = Buffer.alloc(channelID.length);
    for (let i = 0; i < channelID.length; i++) {
      privateBuffer[i] = channelID.charCodeAt(i) ^ key[i];
    }
  
    return privateBuffer.toString('hex');
  },
  
  getPublicID(privateID) {
    const privateSeed = process.env.PRIVATE_SEED;
    if (!privateSeed) {
      console.error('PRIVATE_SEED not set in environment variables');
      return null;
    }
    if (!privateID || privateID.length === 0 || privateID.length % 2 !== 0) {
      console.error('Invalid private ID');
      return null;
    }
  
    const privateBuffer = Buffer.from(privateID, 'hex');
    
    // Generate the same repeating key
    const key = Buffer.from(privateSeed.repeat(Math.ceil(privateBuffer.length / privateSeed.length))).slice(0, privateBuffer.length);
  
    // XOR the privateBuffer with the key to get back the channelID
    let channelID = '';
    for (let i = 0; i < privateBuffer.length; i++) {
      channelID += String.fromCharCode(privateBuffer[i] ^ key[i]);
    }
  
    return channelID;
  },
  
  // Function to generate a secret seed
  generateSecretSeed() {
    return crypto.randomBytes(HASH_LENGTH).toString('hex');
  },

  async getBasicChannel(channelID)
  {
    return await strapi.db.query('api::channel.channel').findOne({
      where: { uniqueID: channelID },
      select: ['id', 'uniqueID', 'name', 'allowsubmissions', 'public'],
      populate: {
          parent: {
              select: ['id', 'uniqueID', 'name'],
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
          picture: {
            select: ['id', 'url', 'formats', 'size'],
          },
          audiofile: {
            select: ['id', 'url', 'size'],
          },
      },
    });
  },
  
  async canEdit(channelID, userID, privateID) {
    if (privateID)
      channelID = strapi.config.functions.getPublicID(privateID);
    if (!channelID)
      return null;
    const channel = await strapi.config.functions.getBasicChannel(channelID);
    if (!channel)
      return null;
    // TODO: hack for superuser
    if (privateID || (userID == 1))
      return channel;
    if (userID && ((channel.owner?.id == userID) || channel.editors?.some(item => item.id == userID)))
      return channel;
    if (channel.parent?.uniqueID)
      return await strapi.config.functions.canEdit(channel.parent.uniqueID, userID);
    return null;
  },

  async getChannel(channelID, userID, privateID)
  {      
    let whereclause = { publishedAt: { $ne: null } };
    let basicChannel = null;

    if (userID || privateID)
    {
      basicChannel = await strapi.config.functions.canEdit(channelID, userID, privateID);
      if (basicChannel)
      {
        whereclause = {};
        channelID = basicChannel.uniqueID
      }
    }

    const channel = await strapi.query('api::channel.channel').findOne({
        where: { uniqueID:  channelID },
        //select: ['id', 'uniqueID', 'name', 'description', 'allowsubmissions', 'showtitle', 'public'],
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
              select: ['id', 'url', 'formats', 'size'],
            },
            audiofile: {
              select: ['id', 'url', 'size'],
            },
            overlays: {
                select: ['id', 'tl_lat', 'tl_long', 'tr_lat', 'tr_long', 'br_lat', 'br_long', 'bl_lat', 'bl_long'],
                populate: {
                    image: {
                        select: ['id', 'url', 'formats', 'size'],
                    }
                }
            },
            tags: {
                select: ['id', 'tag', 'markercolor'],
                populate: {
                  thumbnail: {
                      select: ['id', 'url', 'formats', 'size'],
                  },
                }
            },
            children: {
              orderBy: { order: 'asc' },
              select: ['id', 'uniqueID', 'lat', 'long', 'order'],
              populate: {
                picture: {
                  select: ['id', 'url', 'formats', 'size'],
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
                  audiofile: {
                    select: ['id', 'name', 'url', 'size', 'caption'],
                  },
                  channel: {
                      select: ['id', 'uniqueID', 'markercolor', 'lat', 'long'],
                      populate: {
                          owner: { select: ['id'] },
                          tags: {
                            select: ['id', 'tag', 'markercolor'],
                            populate: {
                                thumbnail: { select: ['url', 'formats'] },
                            }
                          },
                          tileset: {
                            select: ['id', 'name', 'urlformatstring', 'attribution'],
                          },
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

      if (basicChannel)
      {
        channel.canedit = true;
        if (userID == channel.owner.id)
          channel.owned = true;
      }

      return channel;
  },

  async addFile(id, ref, file, key)
  {
      if (!file)
          return null;
  
      if (file) {
          let path = file.path;
          let filename = file.name;
          if (!filename.includes('.'))
            filename += ".bin";
  
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
