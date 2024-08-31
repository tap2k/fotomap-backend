// TODO: Move this somewhere else?
//const { user } = require("pg/lib/defaults");

const crypto = require('crypto');
const dotenv = require('dotenv');

const HASH_LENGTH = 8;
dotenv.config();

module.exports = {
  
  // Function to create the private ID
  createPrivateID(publicID) {
    const privateSeed = process.env.PRIVATE_SEED;
    if (!privateSeed) {
      console.error('PRIVATE_SEED not set in environment variables');
      return null;
    }
    if (!publicID) return "";
    const hash = crypto.createHash('sha1');
    hash.update(publicID + privateSeed);
    const hashHex = hash.digest('hex').substring(0, HASH_LENGTH);
    return `${publicID}:${hashHex}`;
  },
  
  // Function to retrieve and verify the public ID from the private ID
  getPublicID(privateID) {
    const [publicID, hashHex] = privateID.split(':');
    
    const privateSeed = process.env.PRIVATE_SEED;
    if (!privateSeed) {
      console.error('PRIVATE_SEED not set in environment variables');
      return null;
    }
  
    // Recreate the hash to verify
    const hash = crypto.createHash('sha1');
    hash.update(publicID + privateSeed);
    const verificationHashHex = hash.digest('hex').substring(0, HASH_LENGTH);
  
    // Check if the hashes match
    if (hashHex !== verificationHashHex) {
      //console.error('Invalid private ID or tampered data');
      return null;
    }
  
    return publicID;
  },
  
  // Function to generate a secret seed
  generateSecretSeed() {
    return crypto.randomBytes(HASH_LENGTH).toString('hex');
  },

  async getBasicChannel(channelID)
  {
    return await strapi.query('api::channel.channel').findOne({
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
    {
      channelID = strapi.config.functions.getPublicID(privateID);
      if (!channelID)
        return null;
    }
    if (!channelID)
      return null;
    const channel = await strapi.config.functions.getBasicChannel(channelID);
    if (!channel)
      return null;
    if (channelID == "probe" || privateID)
      return channel;
    if (userID && ((channel.owner?.id == userID) || channel.editors?.some(item => item.id == userID)))
      return channel;
    if (channel.parent?.uniqueID)
      return await strapi.config.functions.canEdit(channel.parent.uniqueID, userID);
    return null;
  },

  async getChannel(channelID, userID, privateID)
  {      
    const basicChannel = await strapi.config.functions.canEdit(channelID, userID, privateID);
  
    let whereclause = { publishedAt: { $ne: null } };
    if (!basicChannel)
      whereclause = {};

    return await strapi.query('api::channel.channel').findOne({
        where: { uniqueID: basicChannel.uniqueID },
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
