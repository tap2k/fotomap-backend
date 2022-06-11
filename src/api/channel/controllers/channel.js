'use strict';

/**
 *  channel controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({
    async getMyChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name'],
            where: { owner: ctx.state.user.id },
        });
        return channels;
    },
    async getPublicChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name'],
            where: { public: 'true' },
          });
        return channels;
    },
    async createChannel(ctx) {
        const uuid = require('uuid');
        var myuuid = uuid.v4().substring(0,8);
        const channel = await strapi.db.query('api::channel.channel').create({
            data: {
                uniqueID: myuuid,
                name: ctx.request.body.name,
                public: ctx.request.body.public,
                owner: ctx.state.user.id,
              },
            });
        return channel;
    },
    async deleteChannel(ctx) {
        const channel = await strapi.db.query('api::channel.channel').findOne({
            select: ['uniqueID'],
            where: { 
                owner: ctx.state.user.id,
                uniqueID: ctx.request.body.uniqueID
             },
        });
        if (channel == undefined)
        {
            return ctx.badRequest('No such channel or you are not the owner: ' + ctx.request.body.uniqueID);
        }

        var contentItems = await strapi.query("api::content.content").findMany(
            { 
                where: { channel: { uniqueID: ctx.request.body.uniqueID } },
                populate: {mediafile: {select: ['id', 'url'] } },
            }
            );
        for (const content of contentItems) {
            if (content.mediafile)
                await strapi.query('plugin::upload.file').delete({ where: {id: content.mediafile.id} });
            await strapi.query("api::content.content").delete({ where: { id: content.id } });
          }
        return await strapi.query("api::channel.channel").delete({ where: { uniqueID: ctx.request.body.uniqueID } });
    }
}));
