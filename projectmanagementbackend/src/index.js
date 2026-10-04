import 'dotenv/config';
import app from './app.js';
import connectDB from './db/database.js';
import { createAdminIfNotExists } from './bootstrap/createAdmin.js';



const port = process.env.PORT || 3000;

connectDB()
  .then(async () => {
    await createAdminIfNotExists();

    app.listen(port, () => {
      console.log('Example app listening on port http://localhost:' + port);
    });
  })
  .catch((error) => {
    console.error('MongoDB connectionError', error);
    process.exit(1);
  });
