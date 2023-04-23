'use strict';

/**
 *  channel controller
 */

async function addPictureFunc(channel, file)
{
    if (file) {
        if (channel.picture)
            await strapi.config.functions.deleteMediafile(channel.picture.id);

        let path = file.path;
        let filename = file.name;

        const fs = require('fs');
        const mime = require('mime');
        const mimetype = mime.getType(filename);
        const stats = fs.statSync(path);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: channel.id,
                ref: 'api::channel.channel',
                field: 'picture',
            },
            files: {
                path: path,
                name: filename,
                type: mimetype,
                size: stats.size
            }
        });
    }
}

async function getChannelFunc(channelID)
{
    return  await strapi.query('api::channel.channel').findOne({
        select: ['uniqueID', 'name', 'description', 'lat', 'long', 'zoom', 'public', 'allowsubmissions'],
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
            tileset:
            {
                select: ['id', 'name', 'urlformatstring', 'attribution'],
            },
            picture: {
                select: ['id', 'url', 'formats'],
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

    if (channel.picture)
        await strapi.config.functions.deleteMediafile(content.picture.id);

    return await strapi.service('api::channel.channel').delete(channel.id);
}

async function getChildChannelsFunc(channelID) {
    const channels = await strapi.db.query('api::channel.channel').findMany({
        select: ['uniqueID', 'name', 'description', 'lat', 'long', 'zoom'],
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
            select: ['uniqueID', 'name', 'description', 'lat', 'long', 'zoom'],
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
            select: ['uniqueID', 'name', 'description', 'lat', 'long', 'zoom'],
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
        let ispublic = ctx.request.body.ispublic;
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

        if (!ispublic)
            ispublic = false;
        try {
            const channel = await strapi.db.query('api::channel.channel').create({
                data: {
                    uniqueID: channelid,
                    name: ctx.request.body.name,
                    description: ctx.request.body.description,
                    public: ispublic,
                    owner: owner,
                    editors: editors,
                    parent: ctx.request.body.parentID
                },
            });

            await addPictureFunc(channel, ctx.request.files.picture);
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
        
        /*let data = {};
        data["lat"] = ctx.request.body.lat;
        data["long"] = ctx.request.body.long;
        data["zoom"] = ctx.request.body.zoom;
        data["name"] = ctx.request.body.name;
        data["public"] = ctx.request.body.public;
        if (ctx.request.body.parent == "")
            data["parent"] = null;
        else
            data["parent"] = ctx.request.body.parent;*/

        strapi.config.functions.nullParam("parent", ctx.request.body);
        strapi.config.functions.nullParam("lat", ctx.request.body);
        strapi.config.functions.nullParam("long", ctx.request.body);
        strapi.config.functions.nullParam("zoom", ctx.request.body);
        strapi.config.functions.nullParam("tileset", ctx.request.body);

        if (channel.picture && ctx.request.body.deletepic)
            await strapi.config.functions.deleteMediafile(channel.picture.id);

        if (ctx.request.files)
            await addPictureFunc(channel, ctx.request.files[Object.keys(ctx.request.files)]);

        return await strapi.query("api::channel.channel").update({ 
            where: { id: channel.id },
            data: ctx.request.body,
            //data: data
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

