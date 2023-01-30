'use strict';

/**
 *  avatar controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::avatar.avatar');

module.exports = createCoreController('api::avatar.avatar', ({ strapi }) =>  ({

    async getAvatar(ctx) {
        /*var platform = "All";
        if (ctx.query.platform)
            platform = ctx.query.platform;*/
        const myAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,
                //platform: platform
            },
            select: ['id'],
            populate: {
                pcbundle: {
                    select: ['id', 'url'],
                },
                androidbundle: {
                    select: ['id', 'url'],
                },
                webglbundle: {
                    select: ['id', 'url'],
                },
                macbundle: {
                    select: ['id', 'url'],
                },
                bundle: {
                    select: ['id', 'url'],
                },
            },
          });
        console.log(myAvatar);
        return myAvatar;
    },
    
    async uploadAvatar(ctx) {
        if (!ctx.request.files.bundle) 
            return ctx.badRequest('No avatar bundle specified');

        const platform = ctx.request.body.platform;
        
        var currentAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,      
                //platform: "All"
            },
            select: ['id'],
            populate: {
                pcbundle: {
                    select: ['id', 'url'],
                },
                androidbundle: {
                    select: ['id', 'url'],
                },
                webglbundle: {
                    select: ['id', 'url'],
                },
                macbundle: {
                    select: ['id', 'url'],
                },
            },
        });

        var field = null;
        if (platform == "PC")
        {
            field = "pcbundle";
            if (currentAvatar && currentAvatar.pcbundle)
                await strapi.plugins.upload.services.upload.remove(currentAvatar.pcbundle);
        }
        if (platform == "Android")
        {
            field = "androidbundle";
            if (currentAvatar && currentAvatar.androidbundle)
                await strapi.plugins.upload.services.upload.remove(currentAvatar.androidbundle);
        }
        if (platform == "WebGL")
        {
            field = "webglbundle";
            if (currentAvatar && currentAvatar.webglbundle)
                await strapi.plugins.upload.services.upload.remove(currentAvatar.webglbundle);
        }
        if (platform == "Mac")
        {
            field = "macbundle";
            if (currentAvatar && currentAvatar.macbundle)
                await strapi.plugins.upload.services.upload.remove(currentAvatar.macbundle);
        }


        if (!currentAvatar)
            currentAvatar = await strapi.db.query('api::avatar.avatar').create({
                data: {
                    owner: ctx.state.user.id,
                    //platform: "All",
                },
            });

        if (!currentAvatar)
            return ctx.badRequest('Could not create avatar');

        const fs = require('fs');
        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mimetype = mime.getType(ctx.request.files.bundle.name);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: currentAvatar.id,
                ref: 'api::avatar.avatar',
                field: field,
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
            },
        });

        if (!avatar)
            return ctx.badRequest('No such avatar: ' + ctx.request.body.id);
        
        if (avatar.pcbundle)
            await strapi.plugins.upload.services.upload.remove(avatar.pcbundle);

        if (avatar.androidbundle)
            await strapi.plugins.upload.services.upload.remove(avatar.androidbundle);

        if (avatar.webglbundle)
            await strapi.plugins.upload.services.upload.remove(avatar.webglbundle);

        if (avatar.macbundle)
            await strapi.plugins.upload.services.upload.remove(avatar.macbundle);

        if (avatar.bundle)
            await strapi.plugins.upload.services.upload.remove(avatar.bundle);

        await strapi.service('api::avatar.avatar').delete(avatar.id);
        return "ok";
    },

    /*async convertAvatars(ctx) {
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
            select: ['id', 'username']
          });
        const platforms = ["PC", "Mac", "WebGL", "Android"];
        for (const user of users)
        {
          for (const platform of platforms)
            {
                const avatar = await strapi.db.query('api::avatar.avatar').findOne({
                    where: { 
                        owner: user.id,
                        platform: platform
                     },
                     populate: {
                        bundle: {
                            select: ['id'],
                            }
                        },
                });

                if (!avatar)
                    continue;

                console.log ("Converting avatar " + user.username + " " + platform)

                const currentAvatar = await strapi.db.query('api::avatar.avatar').findOne({
                    where: {
                        owner: user.id,            
                        platform: "All"
                    },
                    select: ['id']
                });

                var data = {
                    owner: user.id,
                    platform: "All"};
                if (platform == "PC")
                    data.pcbundle = avatar.bundle.id;
                if (platform == "Android")
                    data.androidbundle = avatar.bundle.id;
                if (platform == "WebGL")
                    data.webglbundle = avatar.bundle.id;
                if (platform == "Mac")
                    data.macbundle = avatar.bundle.id;
                if (currentAvatar)
                {
                    await strapi.query("api::avatar.avatar").update({ 
                        where: { id: currentAvatar.id },
                        data: data,
                    });
                }
                else
                    await strapi.db.query('api::avatar.avatar').create({data: data});
            }
        }
        return "ok";
    }*/
}));
