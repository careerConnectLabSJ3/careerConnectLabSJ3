import mongoose from 'mongoose';
import app from '../server.js';



const port = process.env.PORT || 3000;

export let gfsBucket;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {dbName: 'careerConnect_db'});
    const nativeDb = mongoose.connection.getClient().db();

    gfsBucket = new mongoose.mongo.GridFSBucket(nativeDb, {
      bucketName: 'profileImages'
    });
    console.log('GridFS Bucket Initialized');

    const server = app.listen(port, () => {
      const url = `http://localhost:${port}`;
      console.log(`Connected to port ${url}`);
    });

    process.on('SIGINT', async () => {
      console.debug('SIGINT signal received: closing HTTP server');
      await mongoose.connection.close(false); 
      console.debug('Mongoose connection closed')

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
