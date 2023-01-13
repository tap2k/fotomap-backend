// TODO: Move this somewhere else?

module.exports = {
  async getChannelID(userID, uniqueID) {
      const channel = await strapi.db.query('api::channel.channel').findOne({
        select: ['id'],
        where: { 
            owner: userID,
            uniqueID: uniqueID
        },
        /*populate: {
          owner: {
              select: ['id'],
              },}*/
      });
      if (!channel)
          return 0;
      else
          return channel.id;
  },
};
