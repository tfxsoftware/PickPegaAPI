import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';

admin.initializeApp();


const db = admin.firestore();
const auth = admin.auth();
const app = express();

app.use(bodyParser.json());
app.use(cors())
//https://southamerica-east1-pick-pega.cloudfunctions.net/api >> HTTP PARA FAZER REQUISIÇÕES (SEGUIDO DA FUNÇÃO QUE QUER CHAMAR EX: /addNewRestaurante)
//quando algum dado é resgatado como "parametro", 
//siguinifica que este deve ser inserido na propria url, 
//por exemplo: southamerica-east1-pick-pega.cloudfunctions.net/api/deleteRestaurante/idaserdeletado


//------------------------------RESTAURANT OPERATIONS-------------------------------------------
  //FUNÇÃO QUE ADICIONA NOVO RESTAURANTE E USUARIO AUTH PARA LOGIN:
  app.post('/addNewRestaurant', async (req: express.Request, res: express.Response) => {
    try {
      const data = req.body; //Body da requisição (objeto restaurante com atributos iguais ao do banco de dados tem que estar contidos nele)
      const batch = db.batch(); //criamos um batch para realizar as duas funções a nível atomico (so funiciona se as duas derem certo)
      const docRef = db.collection('Restaurant').doc(); //isto cria um ID pro restaurante que vamos criar

      const { uid } = await auth.createUser({
        uid: docRef.id,
        email: data.email,
        password: data.password,
        displayName: data.name
      }); // aqui criamos um auth user no firebase auth com os dados disponíveis no que foi passado pela requisição

      batch.set(docRef, {
        ...data,
        uid
      });
      
    // Cria um documento na coleção "menu" com o mesmo ID do restaurante
    const menuDocRef = db.collection('Menu').doc(docRef.id);
    batch.set(menuDocRef, {
        new: true
    });
      
      await batch.commit(); // aqui executamos as 2 ações: criamos o auth user e o restaurante no banco de dados

      res.status(200).json({ status: 202,
                            message: `Restaurante cadastrado`,
                            payload: uid }); //log
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: 500,
                            error: 'Falha ao registrar restaurante'});//log
    }
  });

//FUNÇÃO QUE BUSCA OS DADOS DO RESTAURANTE PELO ID (É O MESMO ID DO AUTHUSER DELE)
app.get('/getRestaurantById/:id', async (req: express.Request, res: express.Response) => {
  try {
    
    const restaurantId = req.params.id  //Pegamos o ID enviado pela requisição

    
    const restaurantDoc = await db.collection('Restaurant').doc(restaurantId).get(); //buscamos este id no banco de dados

    
    if (!restaurantDoc.exists) {
      return res.status(404).json({ status: "404",
                                error: 'Restaurante não encontrado' }); // se não existir retornaremos um erro!
    }

    
    const restaurantData = restaurantDoc.data(); //caso existir pegamos os dados

    
    return res.status(200).json(restaurantData); // aqui retornamos o dados da requisição!
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 500,
                                  error: 'Ocorreu um erro no servidor! tente novamente mais tarde!' });
  }
});
//FUNÇÃO QUE DELETA RESTAURANTES
app.delete('/deleteRestaurant/:id', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.id; // Puxa o id do restaurante por parametros de rota

    // Deleta o documento do firestore
    await db.collection('Restaurant').doc(restaurantId).delete();

    //deleta o authuser (conta de autenticação)
    await auth.deleteUser(restaurantId);

    res.status(200).json({ status: 200, message: 'Restaurante excluído com sucesso',payload: restaurantId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, error: 'Falha ao excluir restaurante' });
  }
});
//FUNÇÃO QUE EDITA O RESTAURANTE
app.put('/editRestaurant/:id', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.id; // pega o id do restaurante
    const updatedData = req.body; // aqui é o novo restaurante a ser trocado (LEMBRAR DE ENVIAR UM OBJETO QUE PREENCHE TODOS OS PARAMETROS MESMO QUE ELES NAO SERAO EDITADOS)

    // faz o update no firebase
    await db.collection('Restaurant').doc(restaurantId).update(updatedData);

    res.status(200).json({ status: 200, message: 'Restaurante atualizado com sucesso', payload: updatedData });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, error: 'Falha ao atualizar restaurante' });
  }
});

// Função para atualizar a senha do usuário de autenticação e a senha no banco de dados usando um batch
app.put('/updatePassword/:id', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.id; // Obter o ID do restaurante dos parâmetros da requisição
    const { novaSenha } = req.body; // Obter a nova senha do corpo da requisição

    const batch = db.batch(); // Criar um batch Firestore

    // Atualizar a senha no documento Firestore
    const restaurantRef = db.collection('Restaurant').doc(restaurantId);
    batch.update(restaurantRef, { password: novaSenha });

    // Obter o usuário de autenticação para atualizar a senha
    await auth.getUser(restaurantId);

    // Atualizar a senha do usuário de autenticação
    await auth.updateUser(restaurantId, { password: novaSenha });

    // Confirmar o batch para executar ambas as atualizações atomicamente
    await batch.commit();

    res.status(200).json({ status: 200, message: 'Senha atualizada com sucesso', payload: novaSenha });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 500, error: 'Falha ao atualizar a senha' });
  }
});

// FUNÇÃO PARA BUSCAR TODOS OS RESTAURANTES
app.get('/getAllRestaurants', async (req: express.Request, res: express.Response) => {
  try {
    // Consulta a coleção 'Restaurantes' no Firestore
    const restaurantesSnapshot = await db.collection('Restaurant').get();

    const restaurantes: any[] = []; // Array para armazenar os restaurantes encontrados

    // Itera sobre os documentos da coleção
    restaurantesSnapshot.forEach((doc) => {
      // Obtém os dados do restaurante
      const restauranteData = doc.data();
      restaurantes.push(restauranteData); // Adiciona o restaurante ao array
    });

    res.status(200).json({
      status: 200,
      message: 'Restaurantes encontrados com sucesso',
      payload: restaurantes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao buscar restaurantes'
    });
  }
});

//------------------------------------ORDER OPERATIONS--------------------------------------
// FUNÇÃO PARA CRIAR UM NOVO DOCUMENTO NA COLEÇÃO "order" 
app.post('/addNewOrder/:id', async (req: express.Request, res: express.Response) => {
  try {
    const novoItem = req.body; // Dados do novo item no corpo da requisição
    const restaurant = req.params.id //ID DO RESTAURANTE

    // Adicionar um novo documento à coleção "Order" com os dados fornecidos
    const itemRef = await db.collection('Order').doc(restaurant).collection("orders").add(novoItem);

    res.status(200).json({
      status: 200,
      message: 'Pedido criado com sucesso',
      payload: { id: itemRef.id }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao criar um novo pedido'
    });
  }
});
app.put('/editOrder/:id', async (req: express.Request, res: express.Response) => {
  try {
    const orderId = req.params.id; // Obter o ID do pedido a ser editado dos parâmetros da requisição
    const updatedOrder = req.body; // Dados atualizados do pedido no corpo da requisição
    const restaurant = updatedOrder.restaurantId

    // Editar o documento na coleção "Order" pelo ID
    await await db.collection('Order').doc(restaurant).collection("orders").doc(orderId).update(updatedOrder);

    res.status(200).json({
      status: 200,
      message: 'Pedido atualizado com sucesso',
      payload: updatedOrder
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao atualizar o pedido'
    });
  }
});


// FUNÇÃO PARA BUSCAR Pedidos POR "restauranteid" COM OS IDs DOS ITENS
app.get('/getRestaurantOrders/:restaurantid', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.restaurantid; // obtendo o id da url

    // pega referencia do documento
    const orderSnapshot = await db.collection('Order').doc(restaurantId).collection("orders").get();
    const orders: any[] = []; // Array para armazenar os restaurantes encontrados

    // Itera sobre os documentos da coleção
    orderSnapshot.forEach((doc) => {
      // Obtém os dados do restaurante
      const orderData = doc.data();
      orders.push(orderData); // Adiciona o restaurante ao array
    });
    

    if (orders.length < 1) {
      res.status(404).json({
        status: 404,
        error: 'Pedido ou restaurante não encontrado!'
      });
      return;
    }


    res.status(200).json({
      status: 200,
      message: 'Pedido encontrados com sucesso',
      payload: orders
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao buscar pedidos'
    });
  }
});

//-------------------------------------------MENU OPERATIONS----------------------------------------------
// FUNÇÃO PARA CRIAR UM NOVO ITEM NO MENU DO RESTAURANTE
app.post('/addNewItem/:id', async (req: express.Request, res: express.Response) => {
  try {
    const novoItem = req.body; // Dados do novo item no corpo da requisição
    const restaurant = req.params.id //ID DO RESTAURANTE

    // Adicionar um novo documento à coleção "Items" com os dados fornecidos
    const itemRef = await db.collection('Menu').doc(restaurant).collection(novoItem.category).add(novoItem);

    res.status(200).json({
      status: 200,
      message: 'Item criado com sucesso',
      payload: { id: itemRef.id }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao criar um novo item'
    });
  }
});

// FUNÇÃO PARA DELETAR UM DOCUMENTO DA COLEÇÃO "Items" PELO ID
app.delete('/deleteItem/:id', async (req: express.Request, res: express.Response) => {
  try {
    const itemId = req.params.id; // Obter o ID do item a ser excluído dos parâmetros da requisição
    const itemInfo = req.body;

    // Deletar o documento da coleção "Items" pelo ID
    await db.collection('Menu').doc(itemInfo.restaurant).collection(itemInfo.category).doc(itemId).delete();

    res.status(200).json({
      status: 200,
      message: 'Item excluído com sucesso',
      payload: itemId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao excluir o item'
    });
  }
});

// FUNÇÃO PARA EDITAR UM DOCUMENTO NA COLEÇÃO "Items" PELO ID
app.put('/editItem/:id', async (req: express.Request, res: express.Response) => {
  try {
    const itemId = req.params.id; // Obter o ID do item a ser editado dos parâmetros da requisição
    const updatedItem = req.body; // Dados atualizados do item no corpo da requisição

    // Editar o documento na coleção "Items" pelo ID
    await db.collection('Menu').doc(updatedItem.restaurantId).collection(updatedItem.category).doc(itemId).update(updatedItem);

    res.status(200).json({
      status: 200,
      message: 'Item atualizado com sucesso',
      payload: updatedItem
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao atualizar o item'
    });
  }
});

//interface para enviar subcoleções
interface MenuData {
  categories: Record<string, any[]>;
}
// FUNÇÃO PARA BUSCAR ITENS POR "restauranteid" COM OS IDs DOS ITENS
app.get('/getRestaurantMenu/:restaurantid', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.restaurantid; // obtendo o id da url

    // pega referencia do documento
    const menuRef = db.collection('Menu').doc(restaurantId);

    const menuData = (await menuRef.get()).data() as MenuData;

    if (!menuData) {
      res.status(404).json({
        status: 404,
        error: 'Menu não encontrado ou não possui itens!'
      });
      return;
    }

    // inica um objeto para guardar os dados de cada categoria
    const menuWithSubcollections: MenuData = {  
      categories: {}
    };

    // pega subcolecoes do documento
    const subcollections = await menuRef.listCollections();

    // loopa as subcolections e pega os dados para cada uma delas
    for (const subcollectionRef of subcollections) {
      const subcollectionData: any[] = [];
      const subcollectionQuery = await subcollectionRef.get();
      subcollectionQuery.forEach((subDoc) => {
        const itemData = subDoc.data();
        itemData.itemId = subDoc.id; // Adiciona o ID
        subcollectionData.push(itemData);
      });
      // guarda cada categoria no seu devido nome
      menuWithSubcollections.categories[subcollectionRef.id] = subcollectionData;
    }

    res.status(200).json({
      status: 200,
      message: 'Menu e categorias encontrados com sucesso',
      payload: menuWithSubcollections
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao buscar itens'
    });
  }
});


app.post('/createCategory/:restaurantId', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.restaurantId;
    const { categoryName } = req.body;

    // acha o menu do restaurant
    const restaurantRef = db.collection('Menu').doc(restaurantId);

    // Cria uma referencia da collection
    const subcollectionRef = restaurantRef.collection(categoryName);

    // adiciona um documento pq nao da pra criar vazia
    subcollectionRef.add({ new: true });
    
    //deleta o documento criado.
    subcollectionRef.get().then((querySnapshot) => {
      querySnapshot.docs.forEach((doc) => {
        doc.ref.delete();
      });
    });
    res.status(200).json({ status: 200,
      message: 'Categoria criada com sucesso!',
      payload: categoryName });
  } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ status: 500,
          error: 'Erro no servidor!' });
  }
});


exports.api = functions.region('southamerica-east1').https.onRequest(app);
