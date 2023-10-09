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

    return await strapi.service('api::channel.channel').delete(channel.id);
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

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({

    async getChannel(ctx) {
        let channel = await strapi.config.functions.getChannel(ctx.query.uniqueID);
        return channel;
    },

    async getMyChannel(ctx) {
        let channel = await strapi.config.functions.getChannel(ctx.query.uniqueID, ctx.state.user.id);
        return channel;
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
                    populate: {
                        owner: {
                            select: ['id'],
                        },
                    }
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
                channelid = (Math.random()+1).toString(36).slice(5);
                const currchannel = await strapi.query('api::channel.channel').findOne({
                    where: { uniqueID: channelid }
                });
                if (currchannel)
                    channelid = null;
            }
        }

        let owner = ctx.state.user.id;
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
                data: ctx.request.body,
                select: ['id', 'uniqueID']
            });

            if (ctx.request.files && Object.keys(ctx.request.files).length)
                await addPictureFunc(channel, ctx.request.files[Object.keys(ctx.request.files)]);
            
            if (order && ctx.request.body.parent)
                await insertChannelFunc(channel, ctx.request.body.parent, order);
            else
            {
                if (ctx.request.body.parent)
                    await insertChannelFunc(channel, ctx.request.body.parent, -1); 
                else
                    await insertChannelFunc(channel, null, -1); 
            }
            return channel;
        } catch (err) {
            return ctx.badRequest(err);
        }    
    },

    async updateChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No channel specified'); 
            
        const canEdit = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);

        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);
        
        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);

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
        console.log(ctx.request.body);

        if (ctx.request.files && Object.keys(ctx.request.files).length)
            await addPictureFunc(channel, ctx.request.files[Object.keys(ctx.request.files)]);
        else
        {
            if (channel.picture && ctx.request.body.deletepic)
                await strapi.config.functions.deleteMediafile(channel.picture.id);
        }

        let newchannel = await strapi.query("api::channel.channel").update({ 
            where: { id: channel.id },
            data: ctx.request.body,
            populate: {
                parent: {
                    select: ['id'],
                },
            }
        });

        if (ctx.request.body.order)
            await insertChannelFunc(newchannel, newchannel.parent.id, ctx.request.body.order);

        return newchannel;
    },

    //TODO: Delete child channels?
    async deleteChannel(ctx) {
        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
        
        let canEdit = false;
        if (channel.parent)
            canEdit = await strapi.config.functions.canEdit(channel.parent.uniqueID, ctx.state.user.id);
    
        if (!(channel.owner.id == ctx.state.user.id) && !canEdit)
            return ctx.badRequest('No such channel or you are not the owner');

        return await deleteChannelFunc(ctx, channel);
    },

    async regenChannelID(ctx) {
        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
    
        if (!(channel.owner.id == ctx.state.user.id))
            return ctx.badRequest('You are not the owner of this channel');

        let channelid = null;
        while (!channelid)
        {
            channelid = (Math.random()+1).toString(36).slice(5);
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

        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
        if (channel.editors.some(editor => editor.id == ctx.state.user.id))
            return "ok";
    
        if (!channel)
            return ctx.badRequest('No such channel');
    
        // TODO: allow this?
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
        
        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
    
        if (!channel)
            return ctx.badRequest('No such channel');
    
        // TODO: allow this?
        if (channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('You dont own this channel');
        
        if (!channel.editors.some(editor => editor.id == user.id))
            return ctx.badRequest('Not an editor');
        
        return await strapi.db.query('api::channel.channel').update({
            where: { id: channel.id },
            data: {
                editors: { disconnect: [{id: user.id}] }
            },
        });        
    },
}));

