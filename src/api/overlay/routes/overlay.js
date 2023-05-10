'use strict';

/**
 * overlay router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::overlay.overlay');
