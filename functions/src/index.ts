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

import * as restaurantOperations from './restaurantOperations'
//https://southamerica-east1-pick-pega.cloudfunctions.net/api >> HTTP PARA FAZER REQUISIÇÕES (SEGUIDO DA FUNÇÃO QUE QUER CHAMAR EX: /addNewRestaurante)
//quando algum dado é resgatado como "parametro", 
//siguinifica que este deve ser inserido na propria url, 
//por exemplo: southamerica-east1-pick-pega.cloudfunctions.net/api/deleteRestaurante/idaserdeletado

  //FUNÇÃO QUE ADICIONA NOVO RESTAURANTE E USUARIO AUTH PARA LOGIN:
  app.post('/addNewRestaurant', async (req: express.Request, res: express.Response) => {
    try {
      const data = req.body;
      const uid = await restaurantOperations.addRestaurant(db, auth, data);
      res.status(200).json({ status: 202,
        message: `Restaurante cadastrado`,
        payload: uid }); //log
    } catch (error) {
          
      res.status(500).json({ status: 500,
        message: `Erro ao cadastrar restaurante`,
        payload: error }); //log

    }
  });

//FUNÇÃO QUE BUSCA OS DADOS DO RESTAURANTE PELO ID (É O MESMO ID DO AUTHUSER DELE)
app.get('/getRestaurantById', async (req: express.Request, res: express.Response) => {
  try {
    
    const restaurantId = req.query.id as string; //Pegamos o ID enviado pela requisição

    
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


// FUNÇÃO PARA CRIAR UM NOVO DOCUMENTO NA COLEÇÃO "pedidos" 
app.post('/addNewOrder', async (req: express.Request, res: express.Response) => {
  try {
    const novoPedido = req.body; // Dados do novo pedido no corpo da requisição

    // Adicionar um novo documento à coleção "pedidos" ( com os dados fornecidos
    const pedidoRef = await db.collection('Order').add(novoPedido);

    res.status(200).json({
      status: 200,
      message: 'Pedido cadastrado com sucesso',
      payload: { id: pedidoRef.id }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao criar um novo pedido'
    });
  }
});

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

// FUNÇÃO PARA BUSCAR ITENS POR "restauranteid" COM OS IDs DOS ITENS
app.get('/getRestaurantMenu/:restaurantid', async (req: express.Request, res: express.Response) => {
  try {
    const restauranteId = req.params.restaurantid; // Obter o ID do restaurante dos parâmetros da requisição

    // Consulta a coleção "Menu" no Firestore para encontrar itens com o "restauranteid" correspondente
    const menu = await db.collection('Menu').doc(restauranteId).get();
    // Verifica se pelo menos um documento foi encontrado
    if (!menu) {
      res.status(404).json({
        status: 404,
        error: 'Restaurante não encontrado ou não possui itens!'
      });
      return;
    }
    res.status(200).json({
      status: 200,
      message: 'Itens encontrados com sucesso',
      payload: menu
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      error: 'Falha ao buscar itens'
    });
  }
});



exports.api = functions.region('southamerica-east1').https.onRequest(app);
