import Webpack from '../modules/webpack.js';

export default {
   displayName: 'Experiments',
   id: 'experiments',
   executor: async () => {
      await Webpack.whenReady;

      const Experiments = Webpack.findByProps('isDeveloper');
      Experiments._isDeveloper = Experiments.isDeveloper;
      Object.defineProperty(Experiments, 'isDeveloper', {
         get: () => true,
         configurable: true
      });

      for (let i = 0; i < Experiments._changeCallbacks.listeners.length; i++) {
         Experiments._changeCallbacks.listeners[i]();  
      }

      return () => {
         Experiments.isDeveloper = Experiments._isDeveloper;
         for (let i = 0; i < Experiments._changeCallbacks.listeners.length; i++) {
            Experiments._changeCallbacks.listeners[i]();  
         }
      };
   }
};
