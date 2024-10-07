'use strict';

/**
 *  channel controller
 */

const crypto = require('crypto');

function generateSecureChannelId(length = 8) {
    const bytes = crypto.randomBytes(length);
    return bytes.toString('base64')
                .replace(/[+/]/g, '')  // replace + and / with empty string
                .replace(/=/g, '')     // remove = padding
                .slice(0, length);     // trim to desired length
    //return Math.random().toString(36).substring(2, 10);
}

async function processFiles(ctx, channel) {
    if (ctx.request.files && Object.keys(ctx.request.files).length) {
      const files = ctx.request.files;
      let imageAdded = false;
      let audioAdded = false;
  
      for (const key of Object.keys(files)) {
        const file = files[key];
        
        if (!imageAdded && file.type.startsWith('image/')) {
          if (channel.picture) await strapi.config.functions.deleteMediafile(channel.picture.id);
          await strapi.config.functions.addFile(channel.id, 'api::channel.channel', file, "picture");
          imageAdded = true;
          ctx.request.body.deletepic = false;
        } else if (!audioAdded && file.type.startsWith('audio/')) {
          if (channel.audiofile) await strapi.config.functions.deleteMediafile(channel.audiofile.id);
          await strapi.config.functions.addFile(channel.id, 'api::channel.channel', file, "audiofile");
          audioAdded = true;
          ctx.request.body.deleteaudio = false;
        }
  
        if (imageAdded && audioAdded) break;
      }
    }
}

async function consolidateChannels(ctx) {
    // TODO: Do this on register
    let mynewchannels = await strapi.db.query('api::channel.channel').findMany({
        where: { $and: [{ email: ctx.state.user.email }, { owner: 1 }] }
    });

    const updateOperations = mynewchannels.map(channel => ({
        where: { id: channel.id },
        data: { owner: ctx.state.user.id }
    }));

    await Promise.all(updateOperations.map(operation => 
        strapi.db.query('api::channel.channel').update(operation)
    ));
}

async function createChannelFunc(ctx, owner) {
    let channelid = ctx.request.body.uniqueID;
    if (!owner)
        owner = 1;

    if (channelid)
    {
        const channel = await strapi.query('api::channel.channel').findOne({
            where: { uniqueID: ctx.request.body.uniqueID },
          });
        if (channel)
            return ctx.badRequest("channel ID already exists: " + channel.uniqueID);
    }
    else
    {
        while (!channelid)
        {
            // Made this longer
            channelid = generateSecureChannelId();
            const currchannel = await strapi.query('api::channel.channel').findOne({
                where: { uniqueID: channelid }
            });
            if (currchannel)
                channelid = null;
        }
    }

    let editors = [];
    let order = -1;

    // TODO: should check if has key
    if (ctx.request.body.order)
        order = ctx.request.body.order;

    if (ctx.request.body.parentID)
    {
        const parentchannel = await strapi.query('api::channel.channel').findOne({
            select: ['id', 'uniqueID'],
            where: { id: ctx.request.body.parentID },
            populate: {
                owner: {
                    select: ['id'],
                    },
                editors: {
                    select: ['id'],
                },
            },
            });
        if (parentchannel)
            owner = parentchannel.owner.id;

    }

    if (!ctx.request.body.public)
        ctx.request.body.public = false;

    if (!ctx.request.body.allowsubmissions)
        ctx.request.body.allowsubmissions = false;

    ctx.request.body.uniqueID = channelid;
    ctx.request.body.parent = ctx.request.body.parentID;
    ctx.request.body.owner = owner;
    ctx.request.body.editors = editors;
    
    try {
        const channel = await strapi.db.query('api::channel.channel').create({
            data: ctx.request.body
        });

        if (ctx.request.files && Object.keys(ctx.request.files).length)
            await processFiles(ctx, channel);
        
        if (order && ctx.request.body.parent)
            await insertChannelFunc(channel, ctx.request.body.parent, order);
        else
        {
            if (ctx.request.body.parent)
                await insertChannelFunc(channel, ctx.request.body.parent, -1); 
        }
        return channel;
    } catch (err) {
        return ctx.badRequest(err);
    }    
}

async function insertChannelFunc(channel, parent, order) {

    const channels = await strapi.db.query('api::channel.channel').findMany({
        where: { $and: [{ parent: parent }, { $not: { id: channel.id } }] },
        select: ['id', 'order', 'name'],
        orderBy: { order: 'asc' },
    });

    if (order == -1)
    {
        if (channels?.length && channels[channels.length - 1].order)
            order = channels[channels.length - 1].order + 1;
        else
            order = 1;
    } 

    var currOrder = 1;
    for (const channelItem of channels)
    {
        if (channelItem.id != channel.id)
            await strapi.query("api::channel.channel").update({
                where: { id: channelItem.id },
                data: { order: currOrder < order ? currOrder : currOrder + 1 },
        });
        currOrder = currOrder + 1;
    }
    
    return await strapi.query("api::channel.channel").update({
        where: { id: channel.id },
        data: { order: order ? Math.min(currOrder, order) : currOrder }
    }); 
}

async function deleteChannelFunc(ctx, channel)
{
    const children = await getChildChannelsFunc(channel.uniqueID);
    await Promise.all(children.map(
        async child => await deleteChannelFunc(ctx, child)
    ));

    const myContents = await strapi.db.query('api::content.content').findMany({
        where: { channel: channel.id },
        select: ['id'],
        populate: {
            mediafile: {
                select: ['id'],
            },
            audiofile: {
                select: ['id'],
            },
        },
    });

    //ctx.query.uniqueID = ctx.request.body.uniqueID;
    //const myContents = strapi.controller('api::content.content').getContentForChannel(ctx);

    for (const content of myContents)
    {
        if (content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);
        if (content.audiofile)
            await strapi.config.functions.deleteMediafile(content.audiofile.id);
        await strapi.service('api::content.content').delete(content.id);
    }

    const myAssets = await strapi.db.query('api::asset.asset').findMany({
        where: { channel: channel.id },
        select: ['id'],
        populate: {
            pcbundle: {
                select: ['id'],
                },
            androidbundle: {
                select: ['id'],
                },
            webglbundle: {
                select: ['id'],
                },
            macbundle: {
                select: ['id'],
                },
            },
          });

    //ctx.query.uniqueID = ctx.request.body.uniqueID;
    //const myContents = strapi.controller('api::content.content').getContentForChannel(ctx);

    for (const asset of myAssets)
    {
        await strapi.config.functions.deleteBundles(asset);
        await strapi.service('api::asset.asset').delete(asset.id);
    }

    if (channel.overlays)
    {
        for (const overlay of channel.overlays)
        {
            if (overlay.image)
                await strapi.config.functions.deleteMediafile(overlay.image.id);
            await strapi.service('api::channel.channel').delete(overlay.id);
        }
    }

    let myTags = await strapi.db.query('api::tag.tag').findMany({
        where: { channel: channel.id },
        orderBy: { tag: 'asc' },
        populate: {
            owner: { select: ['id'] },
            editors: { select: ['id'] },
            thumbnail: { select: ['url', 'formats'] },
            contents: { select: ['id'] },
        },
    });

    for (const tag of myTags)
    {
        if (tag.thumbnail)
            await strapi.config.functions.deleteMediafile(tag.thumbnail.id);
        await strapi.service('api::tag.tag').delete(tag.id);
    }

    if (channel.picture)
        await strapi.config.functions.deleteMediafile(channel.picture.id);

    if (channel.audiofile)
        await strapi.config.functions.deleteMediafile(channel.audiofile.id);

    return await strapi.service('api::channel.channel').delete(channel.id);
}

async function updateChannelFunc(ctx, channel) {
    // TODO: Dont allow reparent?
    if (ctx.request.body.parent == channel.id)
        ctx.request.body.parent = null;
    else
        strapi.config.functions.nullParam("parent", ctx.request.body);
        
    strapi.config.functions.nullParam("lat", ctx.request.body);
    strapi.config.functions.nullParam("long", ctx.request.body);
    strapi.config.functions.nullParam("zoom", ctx.request.body);
    strapi.config.functions.nullParam("tileset", ctx.request.body);
    strapi.config.functions.nullParam("interval", ctx.request.body);
    strapi.config.functions.nullParam("markercolor", ctx.request.body);

    if (ctx.request.files && Object.keys(ctx.request.files).length)
        await processFiles(ctx, channel);

    if (channel.picture?.id && ctx.request.body.deletepic && ctx.request.body.deletepic != "false")
        await strapi.config.functions.deleteMediafile(channel.picture.id);
    if (channel.audiofile?.id && ctx.request.body.deleteaudio && ctx.request.body.deleteaudio != "false")
        await strapi.config.functions.deleteMediafile(channel.audiofile.id);

    let newchannel = await strapi.query("api::channel.channel").update({ 
        where: { id: channel.id },
        data: ctx.request.body,
        populate: {
            parent: {
                select: ['id'],
            }
        }
    });

    if (ctx.request.body.order)
        await insertChannelFunc(newchannel, newchannel.parent.id, ctx.request.body.order);

    return newchannel;
}

async function getChildChannelsFunc(channelID) {
    const channels = await strapi.db.query('api::channel.channel').findMany({
        where: {
            parent: {
              uniqueID: channelID
            }
        },
        orderBy: { order: 'asc' },
        populate: {
            owner: {
                select: ['id', 'username', 'email'],
            },
            picture: {
                select: ['id', 'url', 'formats'],
            },
            parent:{
                select: ['id', 'uniqueID']
            },
            overlays: {
                select: ['id', 'tl_lat', 'tl_long', 'tr_lat', 'tr_long', 'br_lat', 'br_long', 'bl_lat', 'bl_long'],
                populate: {
                    image: {
                        select: ['id', 'url', 'formats'],
                    }
                }
            },
        },
      });
    return channels;
}

async function saveChannelFunc(ctx, channel) {
    try {
        for (const item of ctx.request.body.contents) {
            let content = await strapi.db.query('api::content.content').findOne({
                where: { 
                    id: item.id,
                    channel: channel.id  // Ensure the content belongs to the specified channel
                },
            });

            if (content) {
                await strapi.db.query('api::content.content').update({
                    where: { id: content.id },
                    data: {
                        start_time: item.start_time,
                        duration: item.duration
                    },
                });
            } else {
                console.error(`Content with id ${item.id} not found in channel ${channel.id}`);
            }
        }

        return "ok";
    } catch (error) {
        return ctx.badRequest(error);
    }
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({

    async getPrivateID(ctx) {
        const privateid = strapi.config.functions.createPrivateID(ctx.query.uniqueID);
        return { privateid: privateid };
    },

    async getChannel(ctx) {
        let channel = await strapi.config.functions.getChannel(ctx.query.uniqueID);
        return channel;
    },

    async getMyChannel(ctx) {
        let channel = await strapi.config.functions.getChannel(ctx.query.uniqueID, ctx.state.user.id);
        return channel;
    },

    async getMyChannels(ctx) {

        // TODO: Do this every time?
        await consolidateChannels(ctx);

        const channels = await strapi.db.query('api::channel.channel').findMany({
            //where: { $and: [{owner: ctx.state.user.id}, { parent: null }] },
            where: { $or: [{ owner: ctx.state.user.id }, { editors: ctx.state.user.id }] },
            orderBy: { id: 'asc' },
            populate: {
                owner: {
                    select: ['id', 'username', 'email'],
                },
                parent: {
                    select: ['id', 'name'],
                    populate: {
                        owner: {
                            select: ['id'],
                        },
                    }
                },
                picture: {
                    select: ['id', 'url', 'formats'],
                },
                tileset: {
                    select: ['id', 'name', 'urlformatstring', 'attribution'],
                },
            },
        });
        return channels;
    },

    async getPublicChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            where: { public: 'true' },
            orderBy: { name: 'asc' },
            populate: {
                owner: {
                    select: ['id', 'username', 'email'],
                },
                picture: {
                    select: ['id', 'name', 'url', 'caption', 'formats'],
                },
                audiofile: {
                    select: ['id', 'name', 'url', 'caption'],
                },
                tileset: {
                    select: ['id', 'name', 'urlformatstring', 'attribution'],
                },
                contents: {
                    where: { publishedAt: { $ne: null } },
                    orderBy: { order: 'asc' },
                    populate: {
                        mediafile: {
                            select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                        },
                        audiofile: {
                          select: ['id', 'name', 'url', 'size', 'caption'],
                        },
                    }
                }
            },
          });
        return channels;
    },

    async getChildChannels(ctx) {
        return getChildChannelsFunc(ctx.query.uniqueID);
    },

    async createChannel(ctx) {
        const channel = await createChannelFunc(ctx, ctx.state.user?.id);
        // TODO: insecure?
        channel.privateID = strapi.config.functions.createPrivateID(channel.uniqueID);
        return channel;
    },

    //TODO: Delete child channels?
    async deleteChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No channel specified'); 

        const channel = await strapi.config.functions.getBasicChannel(ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not the owner');
        
        let canEdit = false;
        if (channel.owner.id == ctx.state.user.id)
            canEdit = true;
        else
        {
            if (channel.parent)
                canEdit = await strapi.config.functions.canEdit(channel.parent.uniqueID, ctx.state.user.id);
        }
    
        if (!canEdit)
            return ctx.badRequest('No such channel or you are not the owner');

        return await deleteChannelFunc(ctx, channel);
    },

    async updateChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No channel specified'); 
        
        const channel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);

        if (!channel) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);
        
        return await updateChannelFunc(ctx, channel);
    },

    async saveChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No channel specified'); 

        const channel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id)
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');;
    
        return saveChannelFunc(ctx, channel);
    },

    /*async createSubmissionChannel(ctx) {
        const channel = await createChannelFunc(ctx, 1);
        channel.privateID = strapi.config.functions.createPrivateID(channel.uniqueID);
        return channel;
    },

    async deleteSubmissionChannel(ctx) {
        if (!ctx.request.body.privateID) 
            return ctx.badRequest('No channel specified'); 
        
        const channel = await strapi.config.functions.canEdit(null, null, ctx.request.body.privateID);
        
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');

        return await deleteChannelFunc(ctx, channel);
    },*/


    async getSubmissionChannel(ctx)
    {
        if (!ctx.query.privateID) 
            return ctx.badRequest('No channel specified'); 
        
        const channel = await strapi.config.functions.getChannel(null, null, ctx.query.privateID);
        
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');

        return channel;
    },

    async updateSubmissionChannel(ctx) {
        if (!ctx.request.body.privateID) 
            return ctx.badRequest('No channel specified'); 
        
        const channel = await strapi.config.functions.canEdit(null, null, ctx.request.body.privateID);
        
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');

        return await updateChannelFunc(ctx, channel);
    },

    async saveSubmissionChannel(ctx) {
        if (!ctx.request.body.privateID) 
            return ctx.badRequest('No channel specified'); 

        const channel = await strapi.config.functions.canEdit(null, null, ctx.request.body.privateID)
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');;
    
        return saveChannelFunc(ctx, channel);
    },

    async regenChannelID(ctx) {
        const channel = await strapi.config.functions.getBasicChannel(ctx.request.body.uniqueID);
    
        if (!(channel.owner.id == ctx.state.user.id))
            return ctx.badRequest('You are not the owner of this channel');

        let channelid = null;
        while (!channelid)
        {
            channelid = generateSecureChannelId();
            const currchannel = await strapi.query('api::channel.channel').findOne({
                where: { uniqueID: channelid }
            });
            if (currchannel)
                channelid = null;
        }
        
        return await strapi.db.query('api::channel.channel').update({
            where: { id: channel.id },
            data: {
                uniqueID: channelid
            },
        });        
    },

    async addEditor(ctx) {
        let user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: {$or: [
                {email: ctx.request.body.email},
                {username: ctx.request.body.username}
            ]},
        });

        if (!user)
            return ctx.badRequest('No such user');

        const channel = await strapi.config.functions.getBasicChannel(ctx.request.body.uniqueID);
    
        if (!channel)
            return ctx.badRequest('No such channel');
        
        if (channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('You dont own this channel');
        
        return await strapi.db.query('api::channel.channel').update({
            where: { id: channel.id },
            data: {
                editors: { connect: [{id: user.id}] }
            },
        });        
    },

    async removeEditor(ctx) {
        let user = await strapi.db.query('plugin::users-permissions.user').findOne({
            where: {$or: [
                {email: ctx.request.body.email},
                {username: ctx.request.body.username}
            ]},
        });

        if (!user)
            return ctx.badRequest('No such user');
        
        const channel = await strapi.config.functions.getBasicChannel(ctx.request.body.uniqueID);
    
        if (!channel)
            return ctx.badRequest('No such channel');
    
        if (channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('You dont own this channel');
        
        return await strapi.db.query('api::channel.channel').update({
            where: { id: channel.id },
            data: {
                editors: { disconnect: [{id: user.id}] }
            },
        });        
    },

    async convertChannels(ctx) {

       const allChannels = await strapi.db.query('api::channel.channel').findMany({
            select: ['id', 'uniqueID'],
        });

        for (const channel of allChannels) {
            const myContents = await strapi.db.query('api::content.content').findMany({
                where: { channel: channel.id },
                select: ['id'],
                populate: {
                    mediafile: {
                        select: ['id'],
                    },
                    thumbnail: {
                        select: ['id'],
                    },
                    audiofile: {
                        select: ['id'],
                    },
                },
            });

            for (const content of myContents)
            {
                if (content.thumbnail?.id)
                {
                    await strapi.query("api::content.content").update({
                        where: { id: content.id },
                        data: { 
                            mediafile: content.thumbnail.id,
                            audiofile: content.mediafile?.id ? content.mediafile.id : null
                        },
                    });
                }
            }
        }
        return "ok";
    },

    async getAllSizes() {
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
          populate: ['username', 'email']
        });
      
        const data = await Promise.all(users.map(async (user) => {
        
            const channels = await strapi.db.query('api::channel.channel').findMany({
            where: { 
                owner: user.id,
                parent: null  
            },
            populate: ['uniqueID', 'name']
            });

          let totalSize = 0;
          const channelSizes = await Promise.all(channels.map(async (channel) => {
            const channelSize = await strapi.config.functions.calculateChannelSize(channel.id);
            totalSize += channelSize;
            return {
              id: channel.id,
              name: channel.name,
              uniqueID: channel.uniqueID,
              size: channelSize
            };
          }));
      
          // Sort channels by size in descending order
          channelSizes.sort((a, b) => b.size - a.size);
      
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            totalSize,
            channels: channelSizes
          };
        }));
      
        // Sort the data by user total size
        data.sort((a, b) => b.totalSize - a.totalSize);
      
        return data;
      }   
}));

