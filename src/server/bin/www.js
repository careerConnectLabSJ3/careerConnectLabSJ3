import dotenv from 'dotenv';
import dns from 'dns';
import mongoose from 'mongoose';
import app from '../server.js';
import { initializeFileStorage } from '../serverUtils/fileStorage.js';

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

const port = process.env.PORT || 3000;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {dbName: 'careerConnect_db'});
    const nativeDb = mongoose.connection.getClient().db();
    initializeFileStorage(nativeDb);
    console.log('GridFS Bucket Initialized');

    const server = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Connected to port ${url}`);
    });

    process.on('SIGINT', async () => {
      console.debug('SIGINT signal received: closing HTTP server');
      await mongoose.connection.close(false); 
      console.debug('Mongoose connection closed');

      server.close(() => {
        console.debug('HTTP server closed');
        process.exit(0); 
      });
    });
    
  } catch (e) {
    console.error('Could not connect to MongoDB');
    console.dir(e);
    process.exit(1);
  }

})();
