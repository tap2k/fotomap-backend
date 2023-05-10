'use strict';

/**
 *  channel controller
 */

async function addPictureFunc(channel, file)
{
    if (file) {
        if (channel.picture)
            await strapi.config.functions.deleteMediafile(channel.picture.id);

        return await strapi.config.functions.addFile(channel.id, 'api::channel.channel', file, "picture");   
    }
    else
        return null;
}

async function getChannelFunc(channelID)
{
    return  await strapi.query('api::channel.channel').findOne({
        where: { uniqueID: channelID },
        populate: {
            parent: {
                select: ['id', 'uniqueID'],
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
        },
      });
}

async function deleteChannelFunc(ctx, channelID)
{
    const channel = await getChannelFunc(channelID);

    let canEdit = false;
    if (channel.parent?.uniqueID)
    {
        const parentChannel = await getChannelFunc(channel.parent.uniqueID);
        canEdit = await strapi.config.functions.canEdit(parentChannel, ctx.state.user.id);
    }

    if (!(channel.owner.id == ctx.state.user.id) && !canEdit)
        return ctx.badRequest('No such channel or you are not the owner');

    const myContents = await strapi.db.query('api::content.content').findMany({
        where: { channel: channel.id },
        select: ['id'],
        populate: {
            mediafile: {
                select: ['id'],
                },
            },
            overlay: {
                select: ['id'],
                    populate: {
                        image: {
                            select: ['id', 'url', 'formats'],
                        }
                    }
            },
    });

    //ctx.query.uniqueID = ctx.request.body.uniqueID;
    //const myContents = strapi.controller('api::content.content').getContentForChannel(ctx);

    for (const content of myContents)
    {
        if (content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);
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

    if (channel.overlay)
    {
        if (channel.overlay.image)
            await strapi.config.functions.deleteMediafile(channel.overlay.image.id);
        await strapi.service('api::channel.channel').delete(channel.overlay.id);
    }

    if (channel.picture)
        await strapi.config.functions.deleteMediafile(content.picture.id);

    return await strapi.service('api::channel.channel').delete(channel.id);
}

async function getChildChannelsFunc(channelID) {
    const channels = await strapi.db.query('api::channel.channel').findMany({
        where: {
            parent: {
              uniqueID: channelID
            }
        },
        orderBy: { name: 'asc' },
        populate: {
            owner: {
                select: ['id', 'username', 'email'],
            },
        },
      });
    return channels;
}

async function changeEditorFunc(ctx, userID, channelID, add=true) {
    const channel = await strapi.config.functions.getMyChannel(ctx.state.user.id, channelID);
    
    if (!channel)
        return ctx.badRequest('No such channel or you are not the owner: ' + channelID);
    
    if (channel.owner.id == userID)
        return "ok";

    const children = await getChildChannelsFunc(channelID);
    children.forEach(async(child) => await changeEditorFunc(ctx, userID, child.uniqueID, add));

    let connectClause = { disconnect: [{id: userID}] };
    if (add)
        connectClause = { connect: [{id: userID}] };
        
    return await strapi.db.query('api::channel.channel').update({
        where: { id: channel.id },
        data: {
          editors: connectClause
        },
      });
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({

    async getChannel(ctx) {
        return await getChannelFunc(ctx.query.uniqueID);
    },

    async getMyChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            //where: { $and: [{owner: ctx.state.user.id}, { parent: null }] },
            where: { $or: [{ owner: ctx.state.user.id }, { editors: ctx.state.user.id }] },
            orderBy: { name: 'asc' },
            populate: {
                owner: {
                    select: ['id', 'username', 'email'],
                },
                parent: {
                    select: ['id', 'name'],
                },
                picture: {
                    select: ['id', 'url', 'formats'],
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
                    select: ['id', 'url', 'formats'],
                },
            },
          });
        return channels;
    },

    async getChildChannels(ctx) {
        return getChildChannelsFunc(ctx.query.uniqueID);
    },

    async createChannel(ctx) {
        let channelid = ctx.request.body.uniqueID;
        if (!channelid)
        {
            const uuid = require('uuid');
            channelid = uuid.v4().substring(0,8);
        }
        const channel = await strapi.query('api::channel.channel').findOne({
            select: ['id', 'uniqueID'],
            where: { uniqueID: ctx.request.body.uniqueID },
            populate: {
                owner: {
                    select: ['id'],
                    },
            },
          });
        if (channel)
            return ctx.badRequest("channel ID already exists: " + channel.uniqueID);

        let owner = ctx.state.user.id;
        let editors = [];
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
            owner = parentchannel.owner.id;
            editors = parentchannel.editors;
        }

        if (!ctx.request.body.ispublic)
            ctx.request.body.ispublic = false;
        
        ctx.request.body.uniqueID = channelid;
        ctx.request.body.owner = owner;
        ctx.request.body.editors = editors;
        
        try {
            const channel = await strapi.db.query('api::channel.channel').create({
                data: ctx.request.body,
            });

            if (ctx.request.files && Object.keys(ctx.request.files).length)
                await addPictureFunc(channel, ctx.request.files[Object.keys(ctx.request.files)]);
                
            return channel;
        } catch (err) {
            return ctx.badRequest(err);
        }    
    },

    async updateChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No channel specified'); 
            
        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        if (ctx.request.body.parent == channel.id)
            ctx.request.body.parent = null;
        else
            strapi.config.functions.nullParam("parent", ctx.request.body);
            
        strapi.config.functions.nullParam("lat", ctx.request.body);
        strapi.config.functions.nullParam("long", ctx.request.body);
        strapi.config.functions.nullParam("zoom", ctx.request.body);
        strapi.config.functions.nullParam("tileset", ctx.request.body);
        strapi.config.functions.nullParam("interval", ctx.request.body);

        if (ctx.request.files && Object.keys(ctx.request.files).length)
            await addPictureFunc(channel, ctx.request.files[Object.keys(ctx.request.files)]);
        else
        {
            if (channel.picture && ctx.request.body.deletepic)
                await strapi.config.functions.deleteMediafile(channel.picture.id);
        }

        return await strapi.query("api::channel.channel").update({ 
            where: { id: channel.id },
            data: ctx.request.body,
        });
    },

    //TODO: Delete child channels?
    async deleteChannel(ctx) {
        const children = await getChildChannelsFunc(ctx.request.body.uniqueID);
        children.forEach(async(child) => await deleteChannelFunc(ctx, child.uniqueID));
        return await deleteChannelFunc(ctx, ctx.request.body.uniqueID);
    },

    async addEditor(ctx) {
        let user = await strapi.db.query('plugin::users-permissions.user').findOne({
                where: { $or: [
                    {email: ctx.request.body.email},
                    {username: ctx.request.body.username}
                ] 
            },
        });

        if (!user)
            return ctx.badRequest('No such user');
        
        return await changeEditorFunc(ctx, user.id, ctx.request.body.uniqueID, true);
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
        
        return await changeEditorFunc(ctx, user.id, ctx.request.body.uniqueID, false);
    },
}));

