'use strict';

/**
 *  channel controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({

    async getChannel(ctx) {
        const channel = await strapi.query('api::channel.channel').findOne({
            select: ['uniqueID', 'name', 'lat', 'long', 'zoom'],
            where: { uniqueID: ctx.query.uniqueID },
            populate: {
                parent: {
                    select: ['uniqueID'],
                    },
                owner: {
                    select: ['id'],
                    },
            },
          });
        return channel;
    },

    async getMyChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long', 'zoom'],
            where: { $and: [{ owner: ctx.state.user.id }, { parent: null }] }
        });
        return channels;
    },

    async getPublicChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long', 'zoom'],
            where: { public: 'true' },
            orderBy: { name: 'asc' },
            populate: {
                owner: {
                    select: ['id', 'username', 'email'],
                    },
            },
          });
        return channels;
    },

    async getChildChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long', 'zoom'],
            where: {
                parent: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  },
                }
            },
          });
        return channels;
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
        if (!ispublic)
            ispublic = false;
        try {
            const channel = await strapi.db.query('api::channel.channel').create({
                data: {
                    uniqueID: channelid,
                    name: ctx.request.body.name,
                    public: ispublic,
                    owner: ctx.state.user.id,
                    parent: ctx.request.body.parentID
                },
            });
            return channel;
        } catch (err) {
            return ctx.badRequest(err);
        }    
    },

    async updateChannel(ctx) {
        if (!ctx.request.body.uniqueID) 
            return ctx.badRequest('No order or content specified'); 
            
        const channelID = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channelID) 
            return ctx.badRequest('No such channel or you are not the owner ' + ctx.request.body.uniqueID);
        
        let data = {};
        data["lat"] = ctx.request.body.lat;
        data["long"] = ctx.request.body.long;
        data["zoom"] = ctx.request.body.zoom;
        data["name"] = ctx.request.body.name;
        data["public"] = ctx.request.body.public;
        data["parent"] = ctx.request.body.parent;
        //data["owner"] = ctx.request.body.owner;

        await strapi.query("api::channel.channel").update({ 
            where: { id: channelID },
            data: data,
        });

        return "ok";
    },


    async deleteChannel(ctx) {
        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);
        if (!channelid)
            return ctx.badRequest('No such channel or you are not the owner');

        const myContents = await strapi.db.query('api::content.content').findMany({
            where: { channel: channelid },
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
            where: { channel: channelid },
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

        return await strapi.service('api::channel.channel').deleteChannel(ctx, ctx.request.body.uniqueID);
    }
}));
