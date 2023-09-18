import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from 'body-parser';

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const app = express();

app.use(bodyParser.json());


app.post('/addNewRestaurante', async (req: express.Request, res: express.Response) => {
  try {
    const data = req.body;

    const batch = db.batch();
    const docRef = db.collection('Restaurantes').doc();

    const { uid } = await auth.createUser({
      uid: docRef.id,
      email: data.email,
      password: data.senha,
      displayName: data.nome
    });

    batch.set(docRef, {
      ...data,
      uid
    });
    await batch.commit();

    res.status(200).json({ "message": `Restaurante and Auth User created with ID: ${uid}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Falha ao registrar restaurante' });
  }
});


app.get('/getRestaurantById', async (req: express.Request, res: express.Response) => {
  try {
    
    const restaurantId = req.query.id as string;

    
    const restaurantDoc = await db.collection('Restaurantes').doc(restaurantId).get();

    
    if (!restaurantDoc.exists) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    
    const restaurantData = restaurantDoc.data();

    
    return res.status(200).json(restaurantData);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'An error occurred while fetching the restaurant' });
  }
});

exports.api = functions.region('southamerica-east1').https.onRequest(app);
