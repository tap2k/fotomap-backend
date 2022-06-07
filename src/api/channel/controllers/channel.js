'use strict';

/**
 *  channel controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({
    async getPublicChannels(ctx) {
        const publicChannels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name'],
            where: { public: 'true' },
          });
        return publicChannels;
    },
    async createChannel(ctx) {
        const uuid = require('uuid');
        var myuuid = uuid.v4().substring(0,8);
        const channel = await strapi.db.query('api::channel.channel').create({
            data: {
                uniqueID: myuuid,
                name: ctx.request.body.name,
                public: ctx.request.body.public,
                owner: ctx.state.id,
              },
            });
        return channel;
    },
    async deleteChannel(ctx) {
        console.log("Unique ID = " + ctx.request.body.uniqueID);
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
        console.log("Deleting Channel ID = " + ctx.request.body.uniqueID);
        return await strapi.query("api::channel.channel").delete({ where: { uniqueID: ctx.request.body.uniqueID } });
    }
}));
