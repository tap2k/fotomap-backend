'use strict';

/**
 * tag controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tag.tag');

module.exports = createCoreController('api::tag.tag', ({ strapi }) =>  ({

    async getAllTags(ctx) {
        const myTags = await strapi.db.query('api::tag.tag').findMany({
            select: ['id', 'tag'],
        });
        return myTags;    
    },

}));
