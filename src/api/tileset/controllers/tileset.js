'use strict';

/**
 * tileset controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tileset.tileset');

module.exports = createCoreController('api::tileset.tileset', ({ strapi }) =>  ({

    async getTilesets(ctx) {
        const channels = await strapi.db.query('api::tileset.tileset').findMany({
            select: ['id', 'name', 'urlformatstring'],
            orderBy: { id: 'asc' },
        });
        return channels;
    },

}));

