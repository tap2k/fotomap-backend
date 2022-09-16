'use strict';

/**
 *  avatar controller
 */

const fs = require('fs');

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::avatar.avatar');

module.exports = createCoreController('api::asset.asset', ({ strapi }) =>  ({
    async getAvatar(ctx) {
        const myAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,
                platform: ctx.query.platform
            },
            select: ['id'],
            populate: {
                bundle: {
                    select: ['id', 'url'],
                    },
                },
          });
        return myAvatar;
    },
    async uploadAvatar(ctx) {
        if (!ctx.request.files.bundle) 
        { return ctx.badRequest('No asset bundle specified'); };

        const avatar = await strapi.db.query('api::avatar.avatar').create({
            data: {
                owner: ctx.state.user.id,
                platform: ctx.request.body.platform,
            },
        });

        if (!avatar) { return ctx.badRequest('Could not create asset') };

        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mimetype = mime.getType(ctx.request.files.bundle.name);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: avatar.id,
                ref: 'api::avatar.avatar',
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
