'use strict';

const fs = require('fs');
const formData = require('form-data');

/**
 *  asset controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::asset.asset');

module.exports = createCoreController('api::asset.asset', ({ strapi }) =>  ({
    async getAssetsForChannel(ctx) {
        const myAssets = await strapi.db.query('api::asset.asset').findMany({
            where: {
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  }},
                platform: ctx.query.platform
            },
            select: ['id', 'name'],
            populate: {
                bundle: {
                    select: ['id', 'url'],
                    },
                },
          });
        return myAssets;
    },
    async uploadAssetToChannel(ctx) {
        const channel = await strapi.db.query('api::channel.channel').findOne({
            where: {
                uniqueID: { $eq: ctx.request.body.uniqueID},
            },});
        
        if (!channel) { return ctx.badRequest('No such channel: ' + ctx.request.uniqueID); };
        if (ctx.state.id != channel.owner) { return ctx.badRequest('You do not own this channel'); };

        if (!ctx.request.files.bundle) 
        { return ctx.badRequest('No asset bundle specified'); };

        const asset = await strapi.db.query('api::asset.asset').create({
            data: {
                channel: channel.id,
                name: ctx.request.body.name,
                platform: ctx.request.body.platform,
            },
        });

        if (!asset) { return ctx.badRequest('Could not create asset') };

        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mimetype = mime.getType(ctx.request.files.bundle.name);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: asset.id,
                ref: 'api::asset.asset',
                field: 'bundle',
            }, 
            files: {
                path: ctx.request.files.bundle.path,
                name: ctx.request.files.bundle.name,
                type: "application/octet-stream",
                size: stats.size
            }
        });
        return "ok";
    }
}));