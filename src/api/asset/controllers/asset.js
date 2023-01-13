'use strict';

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
            orderBy: { order: 'asc' },
            select: ['id', 'name'],
            populate: {
                bundle: {
                    select: ['id', 'name', 'url'],
                },
            },
          });
        return myAssets;
    },
    
    async uploadAssetToChannel(ctx) {
        if (!ctx.request.files.bundle) 
            return ctx.badRequest('No asset bundle specified'); 

        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);
        if (!channelid) 
            return ctx.badRequest('No such channel or you do not own this channel');

        const oldAsset = await strapi.db.query('api::asset.asset').findOne({
            where: {
                channel: {
                    uniqueID: {
                    $eq: ctx.request.body.uniqueID
                    }},            
                platform: ctx.request.body.platform,
                name: ctx.request.body.name,
            },
            select: ['id'],
            populate: {
                bundle: {
                    select: ['id'],
                },
            },
        });

        if (oldAsset && oldAsset.bundle)
            await strapi.plugins.upload.services.upload.remove(oldAsset.bundle);

        if (oldAsset)
            await strapi.service('api::asset.asset').delete(oldAsset.id);

        var order = ctx.request.body.order;
        var numItems = -1;
        if (!order)
        {
            numItems = await strapi.query('api::asset.asset').count({ 
                where: { 
                    channel: {
                        uniqueID: {
                        $eq: ctx.request.body.uniqueID
                    }}
                }
            });
            order = numItems + 1;
        }
        const asset = await strapi.db.query('api::asset.asset').create({
            data: {
                channel: channelid,
                name: ctx.request.body.name,
                platform: ctx.request.body.platform,
                order: order,
            },
        });

        if (!asset) 
            return ctx.badRequest('Could not create asset');

        const fs = require('fs');
        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mime = require('mime');
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
    },

    async deleteAsset(ctx) {
        const asset = await strapi.db.query('api::asset.asset').findOne({
            where: { 
                id: ctx.request.body.id,
             },
             populate: {
                bundle: {
                    select: ['id'],
                    },
                channel: {
                    select: ['id', 'uniqueID'],
                    },
                },
        });

        if (!asset)
            return ctx.badRequest('No such asset: ' + ctx.request.body.id);

        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, content.channel.uniqueID);

        if (!channelid)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);
        
        if (asset.bundle)
            await strapi.plugins.upload.services.upload.remove(asset.bundle);

        await strapi.service('api::asset.asset').delete(asset.id);
        return "ok";
    }
}));
