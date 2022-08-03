import Webpack from '../modules/webpack.js';
import Patcher from '../modules/patcher.js';

export default {
   displayName: 'Experiments',
   id: 'experiments',
   executor: async () => {
      await Webpack.whenReady;

      const Dispatcher = Webpack.findByProps('_dispatch', 'dispatch');
      const Users = Webpack.findByProps('getCurrentUser', 'getUser');

      // Wait for dispatcher handlers
      const events = Dispatcher._orderedActionHandlers;
      while (!events.CONNECTION_OPEN) {
         await new Promise(r => setTimeout(r, 10));
      }

      // Grab handlers for CONNECTION_OPEN
      const Handlers = events['CONNECTION_OPEN'];

      // Spoof the staff flag
      const unpatch = Patcher.after('experiments', Users, 'getCurrentUser', (_, __, res) => {
         if (!res) return;

         return new Proxy({}, {
            get(_, prop) {
               if (prop === 'hasFlag') {
                  return function (flag) {
                     if (flag === 1) {
                        return true;
                     }

                     return res.hasFlag.call(this, flag);
                  };
               }

               return res[prop];
            }
         });
      });

      // Call the dispatcher action handler with the spoofed flags to internally allow bucket overrides
      const ExperimentStore = Handlers.find(h => h.name === 'ExperimentStore');
      if (ExperimentStore) ExperimentStore.actionHandler({
         type: 'CONNECTION_OPEN',
         guildExperiments: [],
         experiments: [],
         user: {
            ...Users.getCurrentUser(),
            flags: 1,
         }
      });

      // Call the dispatcher action handler to update isDeveloper internally
      const DeveloperExperimentStore = Handlers.find(h => h.name === 'DeveloperExperimentStore');
      if (DeveloperExperimentStore) DeveloperExperimentStore.actionHandler();

      unpatch();

      return () => Patcher.unpatchAll('experiments');
   }
};
