'use strict';

/**
 *  avatar controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::avatar.avatar');

module.exports = createCoreController('api::avatar.avatar', ({ strapi }) =>  ({

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
            return ctx.badRequest('No avatar bundle specified');
        
        const oldAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,      
                platform: ctx.request.body.platform,
                //name: ctx.request.body.name,
            },
            select: ['id'],
            populate: {
                bundle: {
                    select: ['id'],
                },
            },
        });

        if (oldAvatar && oldAvatar.bundle)
            await strapi.plugins.upload.services.upload.remove(oldAvatar.bundle);

        if (oldAvatar)
            await strapi.service('api::avatar.avatar').delete(oldAvatar.id);

        const avatar = await strapi.db.query('api::avatar.avatar').create({
            data: {
                owner: ctx.state.user.id,
                platform: ctx.request.body.platform,
            },
        });

        if (!avatar)
            return ctx.badRequest('Could not create avatar');

        const fs = require('fs');
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
    },

    async deleteAvatar(ctx) {
        const avatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: { 
                owner: ctx.state.user.id,
             },
             populate: {
                bundle: {
                    select: ['id'],
                    }
                },
        });

        if (!avatar)
            return ctx.badRequest('No such avatar: ' + ctx.request.body.id);
        
        if (avatar.bundle)
            await strapi.plugins.upload.services.upload.remove(avatar.bundle);

        await strapi.service('api::avatar.avatar').delete(avatar.id);
        return "ok";
    }
}));
