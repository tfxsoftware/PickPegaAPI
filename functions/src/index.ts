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


//FUNÇÃO QUE ADICIONA NOVO RESTAURANTE E USUARIO AUTH PARA LOGIN:
app.post('/addNewRestaurante', async (req: express.Request, res: express.Response) => {
  try {
    const data = req.body; //Body da requisição (objeto restaurante com atributos iguais ao do banco de dados tem que estar contidos nele)
    const batch = db.batch(); //criamos um batch para realizar as duas funções a nível atomico (so funiciona se as duas derem certo)
    const docRef = db.collection('Restaurantes').doc(); //isto cria um ID pro restaurante que vamos criar

    const { uid } = await auth.createUser({
      uid: docRef.id,
      email: data.email,
      password: data.senha,
      displayName: data.nome
    }); // aqui criamos um auth user no firebase auth com os dados disponíveis no que foi passado pela requisição

    batch.set(docRef, {
      ...data,
      uid
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
app.get('/getRestaurantById', async (req: express.Request, res: express.Response) => {
  try {
    
    const restaurantId = req.query.id as string; //Pegamos o ID enviado pela requisição

    
    const restaurantDoc = await db.collection('Restaurantes').doc(restaurantId).get(); //buscamos este id no banco de dados

    
    if (!restaurantDoc.exists) {
      return res.status(404).json({ status: "404",
                                error: 'Restaurante não encontrado' }); // se não existir retornaremos um erro!
    }

    
    const restaurantData = restaurantDoc.data(); //caso existir pegamos os dados

    
    return res.status(200).json(restaurantData); // aqui retornamos o dados da requisição!
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 500,
                                  error: 'ocorreu um erro no servidor! tente novamente mais tarde!' });
  }
});
//FUNÇÃO QUE DELETA RESTAURANTES
app.delete('/deleteRestaurante/:id', async (req: express.Request, res: express.Response) => {
  try {
    const restaurantId = req.params.id; // Puxa o id do restaurante por parametros de rota

    // Deleta o documento do firestore
    await db.collection('Restaurantes').doc(restaurantId).delete();

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
    await db.collection('Restaurantes').doc(restaurantId).update(updatedData);

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
    const restaurantRef = db.collection('Restaurantes').doc(restaurantId);
    batch.update(restaurantRef, { senha: novaSenha });

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
app.get('/getAllRestaurantes', async (req: express.Request, res: express.Response) => {
  try {
    // Consulta a coleção 'Restaurantes' no Firestore
    const restaurantesSnapshot = await db.collection('Restaurantes').get();

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
app.post('/addNewPedido', async (req: express.Request, res: express.Response) => {
  try {
    const novoPedido = req.body; // Dados do novo pedido no corpo da requisição

    // Adicionar um novo documento à coleção "pedidos" ( com os dados fornecidos
    const pedidoRef = await db.collection('pedidos').add(novoPedido);

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






exports.api = functions.region('southamerica-east1').https.onRequest(app);
