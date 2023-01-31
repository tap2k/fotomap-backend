'use strict';

/**
 *  asset controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::asset.asset');

module.exports = createCoreController('api::asset.asset', ({ strapi }) =>  ({

    async getAssetsForChannel(ctx) {
        /*var platform = "All";
        if (ctx.query.platform)
            platform = ctx.query.platform;*/
        const myAssets = await strapi.db.query('api::asset.asset').findMany({
            where: {
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  }},            
                //platform: platform
            },
            orderBy: { order: 'asc' },
            select: ['id', 'name'],
            populate: {
                pcbundle: {
                    select: ['id', 'name', 'url'],
                },
                androidbundle: {
                    select: ['id', 'name', 'url'],
                },
                webglbundle: {
                    select: ['id', 'name', 'url'],
                },
                macbundle: {
                    select: ['id', 'name', 'url'],
                },
                /*bundle: {
                    select: ['id', 'name', 'url'],
                },*/
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

        const platform = ctx.request.body.platform;
            
        var currentAsset = await strapi.db.query('api::asset.asset').findOne({
            where: {
                channel: {
                    uniqueID: {
                    $eq: ctx.request.body.uniqueID
                    }},            
                //platform: "All",
                name: ctx.request.body.name
            },
            select: ['id'],
            populate: {
                pcbundle: {
                    select: ['id', 'name', 'url'],
                },
                androidbundle: {
                    select: ['id', 'name', 'url'],
                },
                webglbundle: {
                    select: ['id', 'name', 'url'],
                },
                macbundle: {
                    select: ['id', 'name', 'url'],
                },
            },
        });

        var order = ctx.request.body.order;
        var numItems = -1;
        if (!order)
        {
            numItems = await strapi.query('api::asset.asset').count({ 
                where: { 
                    channel: {
                        uniqueID: {
                        $eq: ctx.request.body.uniqueID
                    }},
                    //platform: "All"
                }
            });
            order = numItems + 1;
        }

        var field = null;
        if (platform == "PC")
        {
            field = "pcbundle";
            if (currentAsset && currentAsset.pcbundle)
                await strapi.plugins.upload.services.upload.remove(currentAsset.pcbundle);
        }
        if (platform == "Android")
        {
            field = "androidbundle";
            if (currentAsset && currentAsset.androidbundle)
                await strapi.plugins.upload.services.upload.remove(currentAsset.androidbundle);
        }
        if (platform == "WebGL")
        {
            field = "webglbundle";
            if (currentAsset && currentAsset.webglbundle)
                await strapi.plugins.upload.services.upload.remove(currentAsset.webglbundle);
        }
        if (platform == "Mac")
        {
            field = "macbundle";
            if (currentAsset && currentAsset.macbundle)
                await strapi.plugins.upload.services.upload.remove(currentAsset.macbundle);
        }

        //if (oldAsset)
        //    await strapi.service('api::asset.asset').delete(oldAsset.id);

        if (!currentAsset)
            currentAsset = await strapi.db.query('api::asset.asset').create({
                data: {
                    channel: channelid,
                    name: ctx.request.body.name,
                    //platform: "All",
                    order: order,
                }
            });

        if (!currentAsset || !field) 
            return ctx.badRequest('Could not create or update asset');

        const fs = require('fs');
        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mime = require('mime');
        //const mimetype = mime.getType(ctx.request.files.bundle.name);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: currentAsset.id,
                ref: 'api::asset.asset',
                field: field,
            }, 
            files: {
                path: ctx.request.files.bundle.path,
                name: ctx.request.files.bundle.name,
                type: "application/octet-stream",
                size: stats.size
            }
        });

        if (numItems == -1)
        {
            const assetItems = await strapi.db.query('api::asset.asset').findMany({
                where: {
                    $and: [
                    {channel: channelid},
                    //{platform: "All"},
                    {order: {$gte: order}}
                    ]
                },
                select: ['id', 'order'],
                orderBy: { order: 'asc' },
            });
    
            for (const updateAsset of assetItems) {
                if (updateAsset.id != currentAsset.id) {
                    await strapi.query("api::asset.asset").update({ 
                        where: { id: updateAsset.id },
                        data: { order: updateAsset.order + 1 },
                    });
                }   
            }
        };

        return "ok";
    },

    async deleteAsset(ctx) {
        const asset = await strapi.db.query('api::asset.asset').findOne({
            where: { 
                id: ctx.request.body.id,
             },
             populate: {
                pcbundle: {
                    select: ['id', 'name', 'url'],
                },
                androidbundle: {
                    select: ['id', 'name', 'url'],
                },
                webglbundle: {
                    select: ['id', 'name', 'url'],
                },
                macbundle: {
                    select: ['id', 'name', 'url'],
                },
                bundle: {
                    select: ['id', 'name', 'url'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    },
                },
        });

        if (!asset)
            return ctx.badRequest('No such asset: ' + ctx.request.body.id);
        
        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, asset.channel.uniqueID);

        if (!channelid)
            return ctx.badRequest('No such asset or you are not the owner');

        if (asset.pcbundle)
            await strapi.plugins.upload.services.upload.remove(asset.pcbundle);

        if (asset.androidbundle)
            await strapi.plugins.upload.services.upload.remove(asset.androidbundle);

        if (asset.webglbundle)
            await strapi.plugins.upload.services.upload.remove(asset.webglbundle);

        if (asset.macbundle)
            await strapi.plugins.upload.services.upload.remove(asset.macbundle);

        if (asset.bundle)
            await strapi.plugins.upload.services.upload.remove(asset.bundle);

        await strapi.service('api::asset.asset').delete(asset.id);
        return "ok";
    },

    /*async convertAssets(ctx) {
        const channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['id', 'uniqueID']
          });
        const platforms = ["PC", "Mac", "WebGL", "Android"];
        for (const channel of channels)
        {
          for (const platform of platforms)
            {
                console.log ("Converting asset " + channel.uniqueID + " " + platform);
                ctx.query.uniqueID = channel.uniqueID;
                ctx.query.platform = platform;
                const assets = await strapi.controller('api::asset.asset').getAssetsForChannel(ctx);
                for (const asset of assets)
                {
                    const currentAsset = await strapi.db.query('api::asset.asset').findOne({
                        where: {
                            channel: channel.id,            
                            platform: "All",
                            name: asset.name
                        },
                        select: ['id', 'name'],
                        populate: {                    
                            bundle: {
                                select: ['id'],
                            },
                        },
                    });

                    var data = {
                        channel: channel.id,
                        name: asset.name,
                        platform: "All",
                        order: asset.order};
                    if (platform == "PC")
                        data.pcbundle = asset.bundle.id;
                    if (platform == "Android")
                        data.androidbundle = asset.bundle.id;
                    if (platform == "WebGL")
                        data.webglbundle = asset.bundle.id;
                    if (platform == "Mac")
                        data.macbundle = asset.bundle.id;
                    if (currentAsset)
                    {
                        await strapi.query("api::asset.asset").update({ 
                            where: { id: currentAsset.id },
                            data: data,
                        });
                    }
                    else
                        await strapi.db.query('api::asset.asset').create({data: data});
                }
            }
        }
        return "ok";
    }*/

}));
