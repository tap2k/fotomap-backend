'use strict';

/**
 * channel service.
 */

const { createCoreService } = require('@strapi/strapi').factories;

//module.exports = createCoreService('api::channel.channel');

module.exports = createCoreService('api::channel.channel', ({ strapi }) =>  ({

    async deleteChannel(ctx, uniqueID) {
        const channel = await strapi.db.query('api::channel.channel').findOne({
            select: ['uniqueID'],
            where: { 
                owner: ctx.state.user.id,
                uniqueID: uniqueID
             },
        });

        if (!channel)
            return ctx.badRequest('No such channel or you are not the owner: ' + uniqueID);

        var contentItems = await strapi.query("api::content.content").findMany(
            { 
                where: { channel: { uniqueID: uniqueID } },
                populate: {mediafile: {select: ['id', 'url'] } },
            }
        );

        for (const content of contentItems) {
            if (content.mediafile)
                await strapi.query('plugin::upload.file').delete({ where: {id: content.mediafile.id} });
            await strapi.query("api::content.content").delete({ where: { id: content.id } });
        }

        var assets = await strapi.query("api::asset.asset").findMany(
            { 
                where: { channel: { uniqueID: ctx.request.body.uniqueID } },
                populate: { bundle: {select: ['id', 'url'] } },
            }
        );

        for (const asset of assets) {
            if (asset.bundle)
                await strapi.query('plugin::upload.file').delete({ where: {id: asset.bundle.id} });
            await strapi.query("api::asset.asset").delete({ where: { id: asset.id } });
        }

        return await strapi.query("api::channel.channel").delete({ where: { uniqueID: uniqueID } });
    }
}));
