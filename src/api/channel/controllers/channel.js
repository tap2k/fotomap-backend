'use strict';

/**
 *  channel controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::channel.channel');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({
    async getMyChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long'],
            where: { owner: ctx.state.user.id },
        });
        return channels;
    },
    async getChannelsForProject(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long'],
            where: { project: { uniqueID: ctx.query.uniqueID }  },
        });
        return channels;
    },    
    async getPublicChannels(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['uniqueID', 'name', 'lat', 'long'],
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

        return await strapi.service('api::channel.channel').deleteChannel(ctx, ctx.request.body.uniqueID);
    }
}));
