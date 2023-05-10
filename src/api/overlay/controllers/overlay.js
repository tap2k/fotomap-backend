'use strict';

/**
 * overlay controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::overlay.overlay');

module.exports = createCoreController('api::channel.channel', ({ strapi }) =>  ({
    
    async getOverlay(ctx) {
        const overlay = await strapi.db.query('api::overlay.overlay').findOne({
            where: {
                channel: {
                  uniqueID: ctx.query.uniqueID
                  },            
            },
            select: ['id', 'tl_lat', 'tl_long', 'tr_lat', 'tr_long', 'br_lat', 'br_long', 'bl_lat', 'bl_long'],
            populate: {
                image: {
                    select: ['id', 'url', 'formats'],
                },
            },
          });
        return overlay;
    },

    async deleteOverlay(ctx) {
        const overlay = await strapi.db.query('api::overlay.overlay').findOne({
            where: { 
                id: ctx.request.body.overlayID,
             },
             populate: {
                image: {
                    select: ['id'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { 
                            select: ['id'],
                        },
                        editor: { 
                            select: ['id'],
                        },                    }
                 },
            },
        });

        if (!overlay)
            return ctx.badRequest('No such overlay');
        
        if (!strapi.config.functions.canEdit(overlay.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + overlay.channel?.uniqueID);

        if (overlay.image)
            await strapi.config.functions.deleteMediafile(overlay.image.id);
        
        await strapi.service('api::overlay.overlay').delete(overlay.id);
        return "ok";
    },

    async uploadOverlay(ctx) {

        if (!ctx.request.files || !Object.keys(ctx.request.files).length)
            return ctx.badRequest('No image specified');

        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);
        
        const file = ctx.request.files[Object.keys(ctx.request.files)];
    
        if (!file)
            return null;
        
        if (channel.overlay)
        {
            if (channel.overlay.image)
                await strapi.config.functions.deleteMediafile(channel.overlay.image.id);
            await strapi.service('api::overlay.overlay').delete(channel.overlay.id);
        }

        const overlay = await strapi.db.query('api::overlay.overlay').create({
            data: { channel: channel.id }
        });
    
        if (!overlay)
            return null;

        await strapi.config.functions.addFile(overlay.id, 'api::overlay.overlay', file, "image");

        return overlay;

    },

    async updateOverlay(ctx) {

        if (!ctx.request.body.overlayID)
            return ctx.badRequest('No overlay specified');
    
        const overlay = await strapi.db.query('api::overlay.overlay').findOne({
            where: { id: ctx.request.body.overlayID },
            select: ['id'],
            populate: {
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                    }
                },
            }
        });

        if (!overlay)
            return ctx.badRequest('No overlay found');
        
        if (!strapi.config.functions.canEdit(overlay.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + overlay.channel.uniqueID);
            
        strapi.config.functions.nullParam("tl_lat", ctx.request.body);
        strapi.config.functions.nullParam("tl_long", ctx.request.body);
        strapi.config.functions.nullParam("tr_lat", ctx.request.body);
        strapi.config.functions.nullParam("tr_long", ctx.request.body);
        strapi.config.functions.nullParam("br_lat", ctx.request.body);
        strapi.config.functions.nullParam("br_long", ctx.request.body);
        strapi.config.functions.nullParam("bl_lat", ctx.request.body);
        strapi.config.functions.nullParam("bl_long", ctx.request.body);

        return await strapi.query("api::overlay.overlay").update({ 
            where: { id: overlay.id },
            data: ctx.request.body,
        });
    },
}));
