declare module 'bcryptjs';
declare module 'jsonwebtoken';
declare module 'nodemailer';

// Extension des types Socket.IO pour inclure nos propriétés personnalisées
declare module 'socket.io' {
  interface Socket {
    data: {
      userId?: string;
      authenticated?: boolean;
      username?: string;
      playerName?: string;
      avatar?: string;
      ready?: boolean;
      serverRestartId?: string;
      serverRestarted?: boolean;
      voluntaryAbandon?: boolean;
    };
  }
}


