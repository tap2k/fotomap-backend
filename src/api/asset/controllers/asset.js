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
                  uniqueID: ctx.query.uniqueID
                  },            
            },
            orderBy: { order: 'asc' },
            populate: {
                pcbundle: {
                    select: ['id', 'name', 'url', 'size'],
                },
                androidbundle: {
                    select: ['id', 'name', 'url', 'size'],
                },
                webglbundle: {
                    select: ['id', 'name', 'url', 'size'],
                },
                macbundle: {
                    select: ['id', 'name', 'url', 'size'],
                }
            },
          });
        return myAssets;
    },
    
    async uploadAssetToChannel(ctx) {

        if (!ctx.request.files.bundle) 
            return ctx.badRequest('No asset bundle specified');
        
        const channel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);
        if (!channel) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        const platform = ctx.request.body.platform;
            
        var currentAsset = await strapi.db.query('api::asset.asset').findOne({
            where: {
                channel: {
                    uniqueID: ctx.request.body.uniqueID
                },            
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
                        uniqueID: ctx.request.body.uniqueID
                    },
                }
            });
            order = numItems + 1;
        }

        var field = null;
        if (platform == "PC")
        {
            field = "pcbundle";
            if (currentAsset && currentAsset.pcbundle)
                await strapi.config.functions.deleteMediafile(currentAsset.pcbundle.id);
        }
        if (platform == "Android")
        {
            field = "androidbundle";
            if (currentAsset && currentAsset.androidbundle)
                await strapi.config.functions.deleteMediafile(currentAsset.androidbundle.id);
        }
        if (platform == "WebGL")
        {
            field = "webglbundle";
            if (currentAsset && currentAsset.webglbundle)
                await strapi.config.functions.deleteMediafile(currentAsset.webglbundle.id);
        }
        if (platform == "Mac")
        {
            field = "macbundle";
            if (currentAsset && currentAsset.macbundle)
                await strapi.config.functions.deleteMediafile(currentAsset.macbundle.id);
        }

        if (!currentAsset)
            currentAsset = await strapi.db.query('api::asset.asset').create({
                data: {
                    channel: channel.id,
                    name: ctx.request.body.name,
                    order: order,
                }
            });

        if (!currentAsset || !field) 
            return ctx.badRequest('Could not create or update asset');

        await strapi.config.functions.addFile(currentAsset.id, 'api::asset.asset', ctx.request.files.bundle, field);   

        if (numItems == -1)
        {
            const assetItems = await strapi.db.query('api::asset.asset').findMany({
                where: {
                    $and: [
                        {channel: channel.id},
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

        if (!asset)
            return ctx.badRequest('No such asset');
        
        const channel = await strapi.config.functions.canEdit(asset.channel.uniqueID, ctx.state.user.id);
        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit');

        await strapi.config.functions.deleteBundles(asset);
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
